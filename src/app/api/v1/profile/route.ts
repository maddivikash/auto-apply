import { requireApiUser, json, fail } from "@/lib/api/auth";
import { readProfile, writeProfile } from "@/lib/api/connector";

export async function GET() {
  try { return json(await readProfile(await requireApiUser())); } catch (e) { return fail(e); }
}

export async function PUT(req: Request) {
  try { const uid = await requireApiUser(); return json(await writeProfile(uid, await req.json())); } catch (e) { return fail(e); }
}
