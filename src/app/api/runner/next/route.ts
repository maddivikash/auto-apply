import { runnerUserId } from "@/lib/auth";
import { listApplications, getSettings, getProfile } from "@/lib/store";
import { Settings } from "@/lib/profile/types";
import { withProfileFallback } from "@/lib/apply/answers";

/** The local runner polls this. Returns the user's work plus the answers it needs to fill forms. */
export async function GET() {
  const uid = await runnerUserId();
  if (!uid) return new Response("Unauthorized", { status: 401 });
  const [apps, settings, profile] = await Promise.all([listApplications(uid), getSettings(uid), getProfile(uid)]);
  const work = apps.filter((a) => a.status === "approved" || a.status === "submit_requested" || (a.status === "code_required" && !!a.verificationCode));
  return Response.json({ work, settings: withProfileFallback(Settings.parse(settings ?? {}), profile) });
}
