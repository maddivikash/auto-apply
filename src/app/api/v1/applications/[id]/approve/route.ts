import { requireApiUser, json, fail } from "@/lib/api/auth";
import { approve } from "@/lib/api/connector";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const uid = await requireApiUser(); const { id } = await params; return json(await approve(uid, id)); }
  catch (e) { return fail(e); }
}
