import { requireApiUser, json, fail } from "@/lib/api/auth";
import { regenerate } from "@/lib/api/connector";

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireApiUser();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { notes?: string };
    return json(await regenerate(uid, id, body.notes), 202);
  } catch (e) { return fail(e); }
}
