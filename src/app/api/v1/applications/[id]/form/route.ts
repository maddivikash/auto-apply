import { requireApiUser, json, fail } from "@/lib/api/auth";
import { formAnswers } from "@/lib/api/connector";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireApiUser();
    const { id } = await params;
    return json(await formAnswers(uid, id, new URL(req.url).searchParams.get("allowOpen") === "1"));
  } catch (e) { return fail(e); }
}
