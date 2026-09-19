import { requireApiUser, json, fail, ApiError } from "@/lib/api/auth";
import { listCompanies, addCompany } from "@/lib/api/connector";

export async function GET(req: Request) {
  try { const uid = await requireApiUser(); return json({ companies: await listCompanies(uid, new URL(req.url).searchParams.get("board") || undefined) }); } catch (e) { return fail(e); }
}

/** POST { careersUrl } adds a Greenhouse, Lever or Ashby board to the user's list. */
export async function POST(req: Request) {
  try {
    const uid = await requireApiUser();
    const body = (await req.json().catch(() => ({}))) as { careersUrl?: string };
    if (!body.careersUrl) throw new ApiError(400, "Body must be JSON with careersUrl.");
    return json(await addCompany(uid, body.careersUrl));
  } catch (e) { return fail(e); }
}
