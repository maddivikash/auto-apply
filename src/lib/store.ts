/**
 * Tiny JSON document store on Vercel Blob. One user, low volume, no DB to provision.
 * Falls back to the local filesystem when BLOB_READ_WRITE_TOKEN is absent (dev and the runner).
 */
import { put, list, del } from "@vercel/blob";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { JobPosting, JobQuestion } from "./jobs/fetch";
import type { TailoredResume } from "./resume/schema";

export type QuestionState = JobQuestion & {
  answer?: string;
  source?: "profile" | "rule" | "user";
  needsHuman: boolean;
};

export type ApplicationStatus =
  | "queued" | "fetching" | "unsupported" | "tailoring" | "rendering" | "ready"
  | "approved" | "filling" | "filled" | "submit_requested" | "submitted" | "failed";

export type Application = {
  id: string;
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

const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DIR = join(process.cwd(), ".data");
const key = (id: string) => `applications/${id}.json`;

export async function saveApplication(app: Application): Promise<void> {
  app.updatedAt = new Date().toISOString();
  const body = JSON.stringify(app, null, 2);
  if (useBlob()) {
    await put(key(app.id), body, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 0 });
  } else {
    mkdirSync(join(LOCAL_DIR, "applications"), { recursive: true });
    writeFileSync(join(LOCAL_DIR, key(app.id)), body);
  }
}

export async function getApplication(id: string): Promise<Application | null> {
  if (useBlob()) {
    const { blobs } = await list({ prefix: key(id), limit: 1 });
    if (!blobs.length) return null;
    const r = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: "no-store" });
    return (await r.json()) as Application;
  }
  const p = join(LOCAL_DIR, key(id));
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Application) : null;
}

export async function listApplications(): Promise<Application[]> {
  let apps: Application[] = [];
  if (useBlob()) {
    const { blobs } = await list({ prefix: "applications/", limit: 200 });
    apps = await Promise.all(blobs.map(async (b) => (await fetch(`${b.url}?t=${Date.now()}`, { cache: "no-store" })).json()));
  } else {
    const dir = join(LOCAL_DIR, "applications");
    if (existsSync(dir)) apps = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
  }
  return apps.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteApplication(id: string): Promise<void> {
  if (useBlob()) {
    const { blobs } = await list({ prefix: key(id), limit: 1 });
    if (blobs.length) await del(blobs[0].url);
  } else {
    const p = join(LOCAL_DIR, key(id));
    if (existsSync(p)) unlinkSync(p);
  }
}

/** Store a binary (PDF, screenshot) and return a URL the email and the runner can fetch. */
export async function saveFile(path: string, data: Buffer, contentType: string): Promise<string> {
  if (useBlob()) {
    const blob = await put(path, data, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType });
    return blob.url;
  }
  const p = join(LOCAL_DIR, path);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, data);
  return `file://${p}`;
}
