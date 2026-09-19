import { requireApiUser, json, fail } from "@/lib/api/auth";
import { getProfile, listApplications } from "@/lib/store";

/** Who am I, and does the account have a profile yet. */
export async function GET() {
  try {
    const uid = await requireApiUser();
    const [profile, apps] = await Promise.all([getProfile(uid), listApplications(uid)]);
    return json({ userId: uid, hasProfile: !!profile, name: profile?.name, applications: apps.length });
  } catch (e) { return fail(e); }
}
