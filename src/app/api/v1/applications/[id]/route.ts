import { requireApiUser, json, fail } from "@/lib/api/auth";
import { getApplicationSummary, removeApplication } from "@/lib/api/connector";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const uid = await requireApiUser();
    const { id } = await params;
    const resume = new URL(req.url).searchParams.get("resume") === "1";
    return json(await getApplicationSummary(uid, id, { resume }));
  } catch (e) { return fail(e); }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try { const uid = await requireApiUser(); const { id } = await params; return json(await removeApplication(uid, id)); }
  catch (e) { return fail(e); }
}
