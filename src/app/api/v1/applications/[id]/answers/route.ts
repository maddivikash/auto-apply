import { requireApiUser, json, fail, ApiError } from "@/lib/api/auth";
import { answerQuestions } from "@/lib/api/connector";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireApiUser();
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as { answers?: Record<string, string> } | null;
    if (!body?.answers || typeof body.answers !== "object") throw new ApiError(400, "Body must be JSON: { answers: { <questionId or label>: <answer> } }");
    return json(await answerQuestions(uid, id, body.answers));
  } catch (e) { return fail(e); }
}
