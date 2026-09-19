import { requireApiUser, json, fail, ApiError } from "@/lib/api/auth";
import { readKnownAnswers, updateKnownAnswers } from "@/lib/api/connector";

export async function GET() {
  try { return json(await readKnownAnswers(await requireApiUser())); } catch (e) { return fail(e); }
}

export async function PATCH(req: Request) {
  try {
    const uid = await requireApiUser();
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") throw new ApiError(400, "Body must be a JSON object of answer fields.");
    return json(await updateKnownAnswers(uid, body));
  } catch (e) { return fail(e); }
}
