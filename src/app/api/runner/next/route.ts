import { runnerUserId } from "@/lib/auth";
import { listApplications, getSettings } from "@/lib/store";
import { Settings } from "@/lib/profile/types";

/** The local runner polls this. Returns the user's work plus the answers it needs to fill forms. */
export async function GET() {
  const uid = await runnerUserId();
  if (!uid) return new Response("Unauthorized", { status: 401 });
  const [apps, settings] = await Promise.all([listApplications(uid), getSettings(uid)]);
  const work = apps.filter((a) => a.status === "approved" || a.status === "submit_requested");
  return Response.json({ work, settings: Settings.parse(settings ?? {}) });
}
