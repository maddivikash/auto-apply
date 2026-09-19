import { requireApiUser, json, fail, ApiError } from "@/lib/api/auth";
import { createApplication, listApplicationSummaries, STATUSES } from "@/lib/api/connector";
import type { ApplicationStatus } from "@/lib/store";

export const maxDuration = 300;

export async function GET(req: Request) {
  try {
    const uid = await requireApiUser();
    const status = new URL(req.url).searchParams.get("status") || undefined;
    if (status && !STATUSES.includes(status as ApplicationStatus)) throw new ApiError(400, `status must be one of ${STATUSES.join(", ")}`);
    return json({ applications: await listApplicationSummaries(uid, status as ApplicationStatus | undefined) });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const uid = await requireApiUser();
    const body = (await req.json().catch(() => ({}))) as { url?: string };
    if (!body.url) throw new ApiError(400, "Body must be JSON with a `url`.");
    return json(await createApplication(uid, body.url), 202);
  } catch (e) { return fail(e); }
}
