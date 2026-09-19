import { after } from "next/server";
import { processApplication } from "@/lib/apply/pipeline";

/** Runs one application's preparation with its own time budget. Called only by scheduleProcessing with the shared secret. */
export const maxDuration = 300;

export async function POST(req: Request) {
  const secret = process.env.APP_SECRET;
  if (!secret || req.headers.get("x-internal-secret") !== secret) return new Response("Forbidden", { status: 403 });
  const { userId, id } = (await req.json().catch(() => ({}))) as { userId?: string; id?: string };
  if (!userId || !id) return new Response("Bad request", { status: 400 });
  after(() => processApplication(userId, id));
  return new Response(null, { status: 202 });
}
