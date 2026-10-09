import { requireApiUser, json, fail } from "@/lib/api/auth";
import { acceptDrafts } from "@/lib/api/connector";

/** Confirm every AI-drafted answer on the application, the REST twin of the MCP accept_drafts tool. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireApiUser();
    const { id } = await params;
    return json(await acceptDrafts(uid, id));
  } catch (e) { return fail(e); }
}
