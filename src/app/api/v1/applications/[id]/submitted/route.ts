import { requireApiUser, json, fail } from "@/lib/api/auth";
import { markSubmitted } from "@/lib/api/connector";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireApiUser();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { note?: string };
    return json(await markSubmitted(uid, id, body.note));
  } catch (e) { return fail(e); }
}
