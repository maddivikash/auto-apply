import { isRunner } from "@/lib/auth";
import { listApplications } from "@/lib/store";

/** The local runner polls this. Returns work in the order it should be done. */
export async function GET() {
  if (!(await isRunner())) return new Response("Unauthorized", { status: 401 });
  const apps = await listApplications();
  const work = apps.filter((a) => a.status === "approved" || a.status === "submit_requested");
  return Response.json({ work });
}
