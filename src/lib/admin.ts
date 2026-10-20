/**
 * Numbers for the admin page: who signed up (Clerk), and what they did (the document store).
 * Read-only. Access is decided by `isAdmin()`: the signed-in user's email must be in ADMIN_EMAILS.
 */
import { clerkClient } from "@clerk/nextjs/server";
import { cache } from "react";
import { scanDocs } from "./docs";
import { userEmail, userId } from "./auth";

export async function isAdmin(): Promise<boolean> {
  const emails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const ids = (process.env.ADMIN_USER_IDS || "").split(",").map((e) => e.trim()).filter(Boolean);
  if (!emails.length && !ids.length) return false;
  const [email, uid] = await Promise.all([userEmail(), userId()]);
  return (!!email && emails.includes(email.toLowerCase())) || (!!uid && ids.includes(uid));
}

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  createdAt: string;
  lastSignInAt?: string;
  lastActiveAt?: string;
  /** Finished onboarding: a profile document exists. */
  hasProfile: boolean;
  applications: number;
  submitted: number;
  failed: number;
  /** Awaiting the user (ready / needs details / code). */
  waiting: number;
  firstApplicationAt?: string;
  lastApplicationAt?: string;
  /** Last write to any of this user's documents. */
  lastActivityAt?: string;
  runnerSeenAt?: string;
  apiKey: boolean;
};

export type DayCount = { date: string; value: number };

export type Failure = { userId: string; user: string; createdAt: string; updatedAt: string; url: string; job: string; error: string };
export type ErrorGroup = { key: string; count: number; lastAt: string; example: string };

export type AdminData = {
  range: number;
  from: string;
  to: string;
  users: AdminUser[];
  totals: {
    users: number;
    newInRange: number;
    newPrevious: number;
    activeInRange: number;
    withProfile: number;
    withApplication: number;
    withSubmission: number;
    applications: number;
    applicationsInRange: number;
    applicationsPrevious: number;
    submitted: number;
    submittedInRange: number;
    failed: number;
    failedInRange: number;
  };
  signupsByDay: DayCount[];
  applicationsByDay: DayCount[];
  submittedByDay: DayCount[];
  statusCounts: { status: string; count: number }[];
  /** Applications that ended in `failed`, newest first (capped). */
  failures: Failure[];
  /** The same failures grouped by normalised error text, so repeat bugs stand out. */
  errorGroups: ErrorGroup[];
  sprintRequests: { createdAt: string; name: string; email: string; country?: string; roles?: string }[];
  fetchedAt: string;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const dayKey = (s?: string | null) => (s ? s.slice(0, 10) : "");

type ClerkUserLite = { id: string; firstName: string | null; lastName: string | null; imageUrl: string; createdAt: number; lastSignInAt: number | null; lastActiveAt: number | null; primaryEmailAddressId: string | null; emailAddresses: { id: string; emailAddress: string }[] };

async function allClerkUsers(): Promise<ClerkUserLite[]> {
  const client = await clerkClient();
  const out: ClerkUserLite[] = [];
  for (let offset = 0; offset < 5000; offset += 500) {
    const page = await client.users.getUserList({ limit: 500, offset, orderBy: "-created_at" });
    out.push(...(page.data as unknown as ClerkUserLite[]));
    if (page.data.length < 500) break;
  }
  return out;
}

function series(days: number, to: Date, dates: string[]): DayCount[] {
  const counts = new Map<string, number>();
  for (const d of dates) if (d) counts.set(d, (counts.get(d) ?? 0) + 1);
  const out: DayCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = iso(new Date(to.getTime() - i * 86400_000));
    out.push({ date: d, value: counts.get(d) ?? 0 });
  }
  return out;
}

export const loadAdminData = cache(async (range: number): Promise<AdminData> => {
  const to = new Date();
  const from = new Date(to.getTime() - (range - 1) * 86400_000);
  const prevFrom = new Date(from.getTime() - range * 86400_000);
  const fromKey = iso(from);
  const prevKey = iso(prevFrom);

  const [clerkUsers, docs, sprint] = await Promise.all([
    allClerkUsers().catch((e) => {
      console.error("clerk users", e);
      return [] as ClerkUserLite[];
    }),
    scanDocs("users/", ["status", "createdAt", "submittedAt", "at", "error", "url", "job.title", "job.company"]),
    scanDocs("sprint-requests/", ["createdAt", "name", "email", "country", "roles"]).catch(() => [])
  ]);

  // One bucket per user id, filled from the document paths.
  type App = { createdAt: string; updatedAt: string; status: string; submittedAt: string | null; error: string | null; url: string; job: string };
  type Bucket = { hasProfile: boolean; apps: App[]; lastActivityAt: string; runnerSeenAt?: string; apiKey: boolean };
  const buckets = new Map<string, Bucket>();
  const bucket = (uid: string) => {
    let b = buckets.get(uid);
    if (!b) buckets.set(uid, (b = { hasProfile: false, apps: [], lastActivityAt: "", apiKey: false }));
    return b;
  };
  for (const d of docs) {
    const m = /^users\/([^/]+)\/(.+)$/.exec(d.path);
    if (!m) continue;
    const b = bucket(m[1]);
    const rest = m[2];
    if (d.updatedAt > b.lastActivityAt) b.lastActivityAt = d.updatedAt;
    if (rest === "profile.json") b.hasProfile = true;
    else if (rest.startsWith("applications/")) b.apps.push({ createdAt: d.fields.createdAt ?? d.updatedAt, updatedAt: d.updatedAt, status: d.fields.status ?? "unknown", submittedAt: d.fields.submittedAt, error: d.fields.error, url: d.fields.url ?? "", job: [d.fields["job.title"], d.fields["job.company"]].filter(Boolean).join(" at ") });
    else if (rest === "runner-seen.json") {
      const at = Number(d.fields.at);
      if (at) b.runnerSeenAt = new Date(at).toISOString();
    } else if (rest === "settings.json") b.apiKey = true; // settings exist once the user has visited Connect or Runner
  }

  const WAITING = new Set(["ready", "code_required", "unsupported"]);
  const users: AdminUser[] = clerkUsers.map((u) => {
    const b = buckets.get(u.id);
    const apps = b?.apps ?? [];
    const sorted = [...apps].sort((a, c) => a.createdAt.localeCompare(c.createdAt));
    const email = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? "";
    return {
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || email.split("@")[0] || u.id,
      email,
      imageUrl: u.imageUrl,
      createdAt: new Date(u.createdAt).toISOString(),
      lastSignInAt: u.lastSignInAt ? new Date(u.lastSignInAt).toISOString() : undefined,
      lastActiveAt: u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : undefined,
      hasProfile: b?.hasProfile ?? false,
      applications: apps.length,
      submitted: apps.filter((a) => a.status === "submitted").length,
      failed: apps.filter((a) => a.status === "failed").length,
      waiting: apps.filter((a) => WAITING.has(a.status)).length,
      firstApplicationAt: sorted[0]?.createdAt,
      lastApplicationAt: sorted.at(-1)?.createdAt,
      lastActivityAt: b?.lastActivityAt || undefined,
      runnerSeenAt: b?.runnerSeenAt,
      apiKey: b?.apiKey ?? false
    };
  });
  // Users who have documents but no Clerk record any more (deleted accounts) still count as activity.
  for (const [uid, b] of buckets) {
    if (clerkUsers.some((u) => u.id === uid)) continue;
    const sorted = [...b.apps].sort((a, c) => a.createdAt.localeCompare(c.createdAt));
    users.push({ id: uid, name: "(deleted account)", email: "", createdAt: sorted[0]?.createdAt ?? b.lastActivityAt, hasProfile: b.hasProfile, applications: b.apps.length, submitted: b.apps.filter((a) => a.status === "submitted").length, failed: b.apps.filter((a) => a.status === "failed").length, waiting: 0, firstApplicationAt: sorted[0]?.createdAt, lastApplicationAt: sorted.at(-1)?.createdAt, lastActivityAt: b.lastActivityAt || undefined, runnerSeenAt: b.runnerSeenAt, apiKey: b.apiKey });
  }
  users.sort((a, c) => (c.lastActivityAt ?? c.createdAt).localeCompare(a.lastActivityAt ?? a.createdAt));

  const allApps = [...buckets.values()].flatMap((b) => b.apps);
  const userLabel = new Map(users.map((u) => [u.id, u.email || u.name]));
  const failures: Failure[] = [...buckets.entries()]
    .flatMap(([uid, b]) => b.apps.filter((a) => a.status === "failed").map((a) => ({ userId: uid, user: userLabel.get(uid) ?? uid, createdAt: a.createdAt, updatedAt: a.updatedAt, url: a.url, job: a.job, error: a.error ?? "(no error recorded)" })))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  // Same bug, different ids/numbers/urls -> one group.
  const normalise = (e: string) => e.replace(/https?:\/\/\S+/g, "<url>").replace(/[0-9a-f]{8,}/gi, "<id>").replace(/\d+/g, "#").replace(/\s+/g, " ").trim().slice(0, 90);
  const groups = new Map<string, ErrorGroup>();
  for (const f of failures) {
    const key = normalise(f.error);
    const g = groups.get(key);
    if (g) { g.count++; if (f.updatedAt > g.lastAt) g.lastAt = f.updatedAt; }
    else groups.set(key, { key, count: 1, lastAt: f.updatedAt, example: f.error.slice(0, 300) });
  }
  const errorGroups = [...groups.values()].sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
  const inRange = (d?: string | null) => !!d && dayKey(d) >= fromKey;
  const inPrev = (d?: string | null) => !!d && dayKey(d) >= prevKey && dayKey(d) < fromKey;
  const activity = (u: AdminUser) => [u.lastActiveAt, u.lastSignInAt, u.lastActivityAt].filter(Boolean).sort().at(-1);

  const statusCounts = Object.entries(allApps.reduce<Record<string, number>>((acc, a) => ((acc[a.status] = (acc[a.status] ?? 0) + 1), acc), {}))
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  return {
    range,
    from: fromKey,
    to: iso(to),
    users,
    totals: {
      users: users.length,
      newInRange: users.filter((u) => inRange(u.createdAt)).length,
      newPrevious: users.filter((u) => inPrev(u.createdAt)).length,
      activeInRange: users.filter((u) => inRange(activity(u))).length,
      withProfile: users.filter((u) => u.hasProfile).length,
      withApplication: users.filter((u) => u.applications > 0).length,
      withSubmission: users.filter((u) => u.submitted > 0).length,
      applications: allApps.length,
      applicationsInRange: allApps.filter((a) => inRange(a.createdAt)).length,
      applicationsPrevious: allApps.filter((a) => inPrev(a.createdAt)).length,
      submitted: allApps.filter((a) => a.status === "submitted").length,
      submittedInRange: allApps.filter((a) => a.status === "submitted" && inRange(a.submittedAt ?? a.createdAt)).length,
      failedInRange: allApps.filter((a) => a.status === "failed" && inRange(a.updatedAt || a.createdAt)).length,
      failed: allApps.filter((a) => a.status === "failed").length
    },
    signupsByDay: series(range, to, users.map((u) => dayKey(u.createdAt))),
    applicationsByDay: series(range, to, allApps.map((a) => dayKey(a.createdAt))),
    submittedByDay: series(range, to, allApps.filter((a) => a.status === "submitted").map((a) => dayKey(a.submittedAt ?? a.createdAt))),
    statusCounts,
    failures: failures.slice(0, 50),
    errorGroups: errorGroups.slice(0, 15),
    sprintRequests: sprint
      .map((d) => ({ createdAt: d.fields.createdAt ?? d.updatedAt, name: d.fields.name ?? "", email: d.fields.email ?? "", country: d.fields.country ?? undefined, roles: d.fields.roles ?? undefined }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20),
    fetchedAt: new Date().toISOString()
  };
});
