/**
 * Preparation takes minutes, so it must never run inside whichever page or API function happened to
 * trigger it: those have their own, often short, time limits and Vercel kills the work without a trace.
 * On Vercel the work is handed to /api/internal/process, which has a 300 s budget of its own.
 * Locally (no APP_SECRET or not on Vercel) it runs in the caller's after() hook, which has no limit.
 */
import { after } from "next/server";
import { processApplication } from "./pipeline";
import { isVercel } from "../env";

export function scheduleProcessing(userId: string, id: string) {
  const secret = process.env.APP_SECRET;
  const base = (process.env.APP_URL || "").replace(/\/$/, "");
  const run = async () => {
    if (isVercel && secret && base) {
      const r = await fetch(`${base}/api/internal/process`, { method: "POST", headers: { "content-type": "application/json", "x-internal-secret": secret }, body: JSON.stringify({ userId, id }) });
      if (r.status === 202) return;
      console.warn(`internal process route answered ${r.status}; running inline`);
    }
    await processApplication(userId, id);
  };
  try { after(run); } catch { void run().catch((e) => console.error(e)); }
}
