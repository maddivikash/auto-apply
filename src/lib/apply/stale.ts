import type { Application } from "../store";

/** Preparation steps run in a background function that Vercel can kill at its time limit without a trace. */
const PREPARING: Application["status"][] = ["queued", "fetching", "tailoring", "rendering"];
export const STALE_MS = 6 * 60_000;
export const STALE_ERROR = "Preparing this application took too long and was stopped by the server. Press Try again.";

/** Mark a preparation step that has not written anything for STALE_MS as failed. Returns true when it changed. */
export function markStale(app: Application, now = Date.now()): boolean {
  if (!PREPARING.includes(app.status)) return false;
  if (now - new Date(app.updatedAt).getTime() < STALE_MS) return false;
  app.status = "failed";
  app.error = STALE_ERROR;
  return true;
}
