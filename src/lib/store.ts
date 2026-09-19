/**
 * The app's state, as JSON documents namespaced per user (see docs.ts for the backends), plus
 * binary files (PDFs, screenshots) in Vercel Blob.
 */
import { put } from "@vercel/blob";
import { readFileSync } from "node:fs";
import { nanoid } from "nanoid";
import { getDoc, putDoc, listDocs, delDoc, putFile, getFile, backend } from "./docs";
import type { JobPosting, JobQuestion } from "./jobs/fetch";
import type { TailoredResume } from "./resume/schema";
import type { Match } from "./resume/match";
import type { Profile, Settings } from "./profile/types";

export type QuestionState = JobQuestion & { answer?: string; source?: "profile" | "rule" | "user"; needsHuman: boolean };

export type ApplicationStatus =
  | "queued" | "fetching" | "unsupported" | "tailoring" | "rendering" | "ready"
  | "approved" | "filling" | "filled" | "submit_requested" | "code_required" | "submitted" | "failed";

export type Application = {
  id: string;
  userId: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  status: ApplicationStatus;
  error?: string;
  job?: Omit<JobPosting, "description"> & { descriptionPreview: string };
  jdSummary?: string;
  fitNotes?: string[];
  headline?: string;
  resume?: TailoredResume;
  resumePdfUrl?: string;
  resumeWarnings?: string[];
  trims?: string[];
  /** Keyword match with the job: tailored resume vs the full profile. */
  match?: Match;
  /** What the user asked to change on the last Regenerate. Fed to the tailoring step with the previous version. */
  revisionNotes?: string;
  questions: QuestionState[];
  emailedAt?: string;
  approvedAt?: string;
  filledScreenshotUrl?: string;
  runnerNotes?: string[];
  /** When the "form is filled" alert and email last went out, so re-fills do not repeat them. */
  filledNotifiedAt?: string;
  /** Greenhouse emailed the applicant a code at submit time; the runner waits for it. */
  codeRequestedAt?: string;
  /** The code the user typed in the app. The runner enters it, then clears it. */
  verificationCode?: string;
  submittedAt?: string;
};

export type Notification = {
  id: string;
  userId: string;
  createdAt: string;
  kind: "ready" | "needs_details" | "filled" | "code_required" | "submitted" | "failed" | "unsupported" | "info";
  title: string;
  body?: string;
  applicationId?: string;
  read: boolean;
};

const putJson = (path: string, value: unknown) => putDoc(path, value);
const getJson = <T,>(path: string) => getDoc<T>(path);
const listJson = <T,>(prefix: string) => listDocs<T>(prefix);
const delJson = (path: string) => delDoc(path);

// ---- applications -----------------------------------------------------------
const appKey = (userId: string, id: string) => `users/${userId}/applications/${id}.json`;

export async function saveApplication(app: Application) { app.updatedAt = new Date().toISOString(); await putJson(appKey(app.userId, app.id), app); }
export const getApplication = (userId: string, id: string) => getJson<Application>(appKey(userId, id));
export async function listApplications(userId: string) { return (await listJson<Application>(`users/${userId}/applications/`)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export const deleteApplication = (userId: string, id: string) => delJson(appKey(userId, id));

// ---- profile and settings ---------------------------------------------------
export const getProfile = (userId: string) => getJson<Profile>(`users/${userId}/profile.json`);
export const saveProfile = (userId: string, p: Profile) => putJson(`users/${userId}/profile.json`, p);
export const getSettings = (userId: string) => getJson<Settings>(`users/${userId}/settings.json`);
export const saveSettings = (userId: string, s: Settings) => putJson(`users/${userId}/settings.json`, s);

// ---- runner tokens ----------------------------------------------------------
export const saveRunnerToken = (token: string, userId: string) => putJson(`runner-tokens/${token}.json`, { userId, createdAt: new Date().toISOString() });
export const userForRunnerToken = async (token: string) => (await getJson<{ userId: string }>(`runner-tokens/${token}.json`))?.userId ?? null;
export const deleteRunnerToken = (token: string) => delJson(`runner-tokens/${token}.json`);

// ---- notifications ----------------------------------------------------------
export async function addNotification(n: Omit<Notification, "id" | "createdAt" | "read">) {
  // One live alert per kind and application: a repeat replaces the unread one instead of stacking.
  if (n.applicationId) {
    const dup = (await listNotifications(n.userId)).find((x) => !x.read && x.kind === n.kind && x.applicationId === n.applicationId);
    if (dup) { await putJson(`users/${n.userId}/notifications/${dup.id}.json`, { ...dup, ...n, createdAt: new Date().toISOString() }); return; }
  }
  const full: Notification = { ...n, id: nanoid(10), createdAt: new Date().toISOString(), read: false };
  await putJson(`users/${n.userId}/notifications/${full.id}.json`, full);
}
export async function listNotifications(userId: string) { return (await listJson<Notification>(`users/${userId}/notifications/`)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export async function markNotificationsRead(userId: string, ids?: string[]) {
  const all = await listNotifications(userId);
  await Promise.all(all.filter((n) => !n.read && (!ids || ids.includes(n.id))).map((n) => putJson(`users/${userId}/notifications/${n.id}.json`, { ...n, read: true })));
}

// ---- files ------------------------------------------------------------------
/**
 * Store a binary (PDF, screenshot). Returns a URL the app can turn back into bytes: a public Blob URL
 * on the Blob backend, otherwise an internal app:// path served through the application's own routes.
 */
export async function saveFile(path: string, data: Buffer, contentType: string): Promise<string> {
  if (backend() === "blob") {
    const blob = await put(path, data, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType });
    return blob.url;
  }
  await putFile(path, data, contentType);
  return `app://${path}`;
}
export async function readFileUrl(url: string): Promise<Uint8Array> {
  if (url.startsWith("app://")) { const f = await getFile(url.slice(6)); if (!f) throw new Error(`File not found: ${url}`); return f.data; }
  if (url.startsWith("file://")) return new Uint8Array(readFileSync(url.slice(7)));
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`File fetch ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}
/** Browser-openable URL for a stored file: public Blob URLs as-is, internal files through the app's route. */
export const fileHref = (appId: string, kind: "pdf" | "screenshot", url?: string) => (!url || url.startsWith("app://") || url.startsWith("file://") ? `/api/applications/${appId}/${kind}` : url);
