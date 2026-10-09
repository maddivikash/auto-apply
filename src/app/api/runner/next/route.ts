import { runnerUserId } from "@/lib/auth";
import { listApplications, getSettings, getProfile, saveApplication } from "@/lib/store";
import { Settings } from "@/lib/profile/types";
import { refreshAnswers, withProfileFallback } from "@/lib/apply/answers";
import { markRunnerSeen } from "@/lib/runner-link";
import { getBank } from "@/lib/apply/bank";

/** The local runner polls this. Returns the user's work plus the answers it needs to fill forms. */
export async function GET(req: Request) {
  const uid = await runnerUserId();
  if (!uid) return new Response("Unauthorized", { status: 401 });
  // Lets the Runner page say "connected, last seen a minute ago" instead of showing setup steps.
  await markRunnerSeen(uid, req.headers.get("x-runner-client") || "runner").catch(() => {});
  const [apps, settings, profile] = await Promise.all([listApplications(uid), getSettings(uid), getProfile(uid)]);
  const work = apps.filter((a) => a.status === "approved" || a.status === "submit_requested" || (a.status === "code_required" && !!a.verificationCode));
  const merged = withProfileFallback(Settings.parse(settings ?? {}), profile);
  // Rule answers were computed when the application was prepared; recompute them now so a changed
  // standing answer, or a corrected rule, reaches the form without a regenerate. User answers stay.
  if (work.length) {
    const bank = await getBank(uid);
    await Promise.all(work.filter((a) => refreshAnswers(a, merged, bank)).map((a) => saveApplication(a)));
  }
  return Response.json({ work, settings: merged });
}
