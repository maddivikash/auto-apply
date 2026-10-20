/**
 * Numbers for the admin page: who signed up (Clerk), and what they did (the document store).
 * Read-only. Access is decided by `isAdmin()`: the signed-in user's email must be in ADMIN_EMAILS.
 */
import { clerkClient } from "@clerk/nextjs/server";
import { cache } from "react";
import { scanDocs } from "./docs";
import { userEmail, userId } from "./auth";

/** The owner's accounts. ADMIN_EMAILS in the environment adds to this list; it never needs to be set for these. */
const OWNER_EMAILS = ["vikashmaddi@gmail.com", "vickyvikashmaddi@gmail.com", "vikashmaddi1@gmail.com", "praneat.data@vmock.com"];

/** Accounts that are the owner's own or test logins; hidden from the numbers unless asked for. */
export const INTERNAL_EMAILS = new Set([...OWNER_EMAILS, "maddivikash@gmail.com", "skillsync.mailer@gmail.com"]);

export async function isAdmin(): Promise<boolean> {
  const emails = [...OWNER_EMAILS, ...(process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)];
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
  /** Notification emails that Resend refused for this user. */
  emailFailures: number;
  /** Owner or test account. */
  internal: boolean;
  /** One line on what is stopping this user from getting a submission out. */
  blockedBy?: string;
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
  /** Refused notification emails across all users, with the most common reason. */
  emailFailures: { count: number; reason?: string };
  includeInternal: boolean;
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

export const loadAdminData = cache(async (range: number, includeInternal = false): Promise<AdminData> => {
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
    scanDocs("users/", ["status", "createdAt", "submittedAt", "at", "error", "url", "job.title", "job.company", "title", "body"]),
    scanDocs("sprint-requests/", ["createdAt", "name", "email", "country", "roles"]).catch(() => [])
  ]);

  // One bucket per user id, filled from the document paths.
  type App = { createdAt: string; updatedAt: string; status: string; submittedAt: string | null; error: string | null; url: string; job: string };
  type Bucket = { hasProfile: boolean; apps: App[]; lastActivityAt: string; runnerSeenAt?: string; apiKey: boolean; emailFailures: number; emailReason?: string };
  const buckets = new Map<string, Bucket>();
  const bucket = (uid: string) => {
    let b = buckets.get(uid);
    if (!b) buckets.set(uid, (b = { hasProfile: false, apps: [], lastActivityAt: "", apiKey: false, emailFailures: 0 }));
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
    else if (rest.startsWith("notifications/") && (d.fields.title ?? "").startsWith("Notification email not delivered")) {
      b.emailFailures++;
      b.emailReason ??= d.fields.body ?? undefined;
    }
  }

  const WAITING = new Set(["ready", "code_required", "unsupported"]);
  const blockedBy = (b: Bucket | undefined, hasProfile: boolean, apps: App[], submitted: number): string | undefined => {
    if (submitted) return undefined;
    if (!hasProfile) return "has not uploaded a resume";
    if (!apps.length) return "has not pasted a job link";
    const waiting = apps.filter((a) => a.status === "ready" || a.status === "code_required").length;
    const unsupported = apps.filter((a) => a.status === "unsupported").length;
    const parts: string[] = [];
    if (waiting) parts.push(`${waiting} resume${waiting > 1 ? "s" : ""} waiting for their answers and Submit`);
    if (unsupported && unsupported === apps.length) parts.push("every link was unsupported");
    if (!b?.runnerSeenAt) parts.push("runner never installed");
    if (b?.emailFailures) parts.push(`${b.emailFailures} email${b.emailFailures > 1 ? "s" : ""} not delivered`);
    return parts.join("; ") || undefined;
  };
  const allClerk: AdminUser[] = clerkUsers.map((u) => {
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
      apiKey: b?.apiKey ?? false,
      emailFailures: b?.emailFailures ?? 0,
      internal: INTERNAL_EMAILS.has(email.toLowerCase()),
      blockedBy: blockedBy(b, b?.hasProfile ?? false, apps, apps.filter((a) => a.status === "submitted").length)
    };
  });
  const users: AdminUser[] = allClerk;
  // Users who have documents but no Clerk record any more (deleted accounts) still count as activity.
  for (const [uid, b] of buckets) {
    if (clerkUsers.some((u) => u.id === uid)) continue;
    const sorted = [...b.apps].sort((a, c) => a.createdAt.localeCompare(c.createdAt));
    users.push({ id: uid, name: "(deleted account)", email: "", createdAt: sorted[0]?.createdAt ?? b.lastActivityAt, hasProfile: b.hasProfile, applications: b.apps.length, submitted: b.apps.filter((a) => a.status === "submitted").length, failed: b.apps.filter((a) => a.status === "failed").length, waiting: 0, firstApplicationAt: sorted[0]?.createdAt, lastApplicationAt: sorted.at(-1)?.createdAt, lastActivityAt: b.lastActivityAt || undefined, runnerSeenAt: b.runnerSeenAt, apiKey: b.apiKey, emailFailures: b.emailFailures, internal: false });
  }
  users.sort((a, c) => (c.lastActivityAt ?? c.createdAt).localeCompare(a.lastActivityAt ?? a.createdAt));

  // Owner and test accounts are not customers; keep them out of the numbers unless asked for.
  const external = includeInternal ? users : users.filter((u) => !u.internal);
  const externalIds = new Set(external.map((u) => u.id));
  const allApps = [...buckets.entries()].filter(([uid]) => externalIds.has(uid) || !clerkUsers.some((u) => u.id === uid)).flatMap(([, b]) => b.apps);
  const emailFailTotal = [...buckets.entries()].filter(([uid]) => externalIds.has(uid)).reduce((a, [, b]) => a + b.emailFailures, 0);
  const emailReason = [...buckets.values()].find((b) => b.emailReason)?.emailReason;
  const userLabel = new Map(users.map((u) => [u.id, u.email || u.name]));
  const failures: Failure[] = [...buckets.entries()]
    .filter(([uid]) => externalIds.has(uid) || !clerkUsers.some((u) => u.id === uid))
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
    users: external,
    totals: {
      users: external.length,
      newInRange: external.filter((u) => inRange(u.createdAt)).length,
      newPrevious: external.filter((u) => inPrev(u.createdAt)).length,
      activeInRange: external.filter((u) => inRange(activity(u))).length,
      withProfile: external.filter((u) => u.hasProfile).length,
      withApplication: external.filter((u) => u.applications > 0).length,
      withSubmission: external.filter((u) => u.submitted > 0).length,
      applications: allApps.length,
      applicationsInRange: allApps.filter((a) => inRange(a.createdAt)).length,
      applicationsPrevious: allApps.filter((a) => inPrev(a.createdAt)).length,
      submitted: allApps.filter((a) => a.status === "submitted").length,
      submittedInRange: allApps.filter((a) => a.status === "submitted" && inRange(a.submittedAt ?? a.createdAt)).length,
      failedInRange: allApps.filter((a) => a.status === "failed" && inRange(a.updatedAt || a.createdAt)).length,
      failed: allApps.filter((a) => a.status === "failed").length
    },
    signupsByDay: series(range, to, external.map((u) => dayKey(u.createdAt))),
    applicationsByDay: series(range, to, allApps.map((a) => dayKey(a.createdAt))),
    submittedByDay: series(range, to, allApps.filter((a) => a.status === "submitted").map((a) => dayKey(a.submittedAt ?? a.createdAt))),
    statusCounts,
    failures: failures.slice(0, 50),
    errorGroups: errorGroups.slice(0, 15),
    sprintRequests: sprint
      .map((d) => ({ createdAt: d.fields.createdAt ?? d.updatedAt, name: d.fields.name ?? "", email: d.fields.email ?? "", country: d.fields.country ?? undefined, roles: d.fields.roles ?? undefined }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20),
    emailFailures: { count: emailFailTotal, reason: emailReason },
    includeInternal,
    fetchedAt: new Date().toISOString()
  };
});
