/**
 * JSON document store on Vercel Blob, namespaced per user. Low volume, no DB to provision.
 * Falls back to the local filesystem when BLOB_READ_WRITE_TOKEN is absent.
 */
import { put, list, del } from "@vercel/blob";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import type { JobPosting, JobQuestion } from "./jobs/fetch";
import type { TailoredResume } from "./resume/schema";
import type { Profile, Settings } from "./profile/types";

export type QuestionState = JobQuestion & { answer?: string; source?: "profile" | "rule" | "user"; needsHuman: boolean };

export type ApplicationStatus =
  | "queued" | "fetching" | "unsupported" | "tailoring" | "rendering" | "ready"
  | "approved" | "filling" | "filled" | "submit_requested" | "submitted" | "failed";

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
  questions: QuestionState[];
  emailedAt?: string;
  approvedAt?: string;
  filledScreenshotUrl?: string;
  runnerNotes?: string[];
  submittedAt?: string;
};

export type Notification = {
  id: string;
  userId: string;
  createdAt: string;
  kind: "ready" | "needs_details" | "filled" | "submitted" | "failed" | "unsupported" | "info";
  title: string;
  body?: string;
  applicationId?: string;
  read: boolean;
};

const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DIR = join(process.cwd(), ".data");

async function putJson(path: string, value: unknown) {
  const body = JSON.stringify(value, null, 2);
  if (blobEnabled()) {
    await put(path, body, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 0 });
  } else {
    const p = join(LOCAL_DIR, path); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, body);
  }
}
async function getJson<T>(path: string): Promise<T | null> {
  if (blobEnabled()) {
    const { blobs } = await list({ prefix: path, limit: 1 });
    const hit = blobs.find((b) => b.pathname === path);
    if (!hit) return null;
    const r = await fetch(`${hit.url}?t=${Date.now()}`, { cache: "no-store" });
    return (await r.json()) as T;
  }
  const p = join(LOCAL_DIR, path);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : null;
}
async function listJson<T>(prefix: string): Promise<T[]> {
  if (blobEnabled()) {
    const { blobs } = await list({ prefix, limit: 500 });
    return Promise.all(blobs.filter((b) => b.pathname.endsWith(".json")).map(async (b) => (await fetch(`${b.url}?t=${Date.now()}`, { cache: "no-store" })).json()));
  }
  const dir = join(LOCAL_DIR, prefix);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
}
async function delJson(path: string) {
  if (blobEnabled()) {
    const { blobs } = await list({ prefix: path, limit: 1 });
    const hit = blobs.find((b) => b.pathname === path);
    if (hit) await del(hit.url);
  } else {
    const p = join(LOCAL_DIR, path); if (existsSync(p)) unlinkSync(p);
  }
}

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
  const full: Notification = { ...n, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), read: false };
  await putJson(`users/${n.userId}/notifications/${full.id}.json`, full);
  return full;
}
export async function listNotifications(userId: string) { return (await listJson<Notification>(`users/${userId}/notifications/`)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export async function markNotificationsRead(userId: string, ids?: string[]) {
  const all = await listNotifications(userId);
  await Promise.all(all.filter((n) => !n.read && (!ids || ids.includes(n.id))).map((n) => putJson(`users/${userId}/notifications/${n.id}.json`, { ...n, read: true })));
}

// ---- files ------------------------------------------------------------------
/** Store a binary (PDF, screenshot) and return a URL the email and the runner can fetch. */
export async function saveFile(path: string, data: Buffer, contentType: string): Promise<string> {
  if (blobEnabled()) {
    const blob = await put(path, data, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType });
    return blob.url;
  }
  const p = join(LOCAL_DIR, path); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, data);
  return `file://${p}`;
}
export async function readFileUrl(url: string): Promise<Uint8Array> {
  if (url.startsWith("file://")) return new Uint8Array(readFileSync(url.slice(7)));
  return new Uint8Array(await (await fetch(url, { cache: "no-store" })).arrayBuffer());
}
