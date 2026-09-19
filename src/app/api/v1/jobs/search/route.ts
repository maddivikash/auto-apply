import { requireApiUser, json, fail, ApiError } from "@/lib/api/auth";
import { findJobs } from "@/lib/api/connector";

export const maxDuration = 60;

/** GET /api/v1/jobs/search?q=ai+agents&location=India,Remote&limit=30&boards=greenhouse,ashby */
export async function GET(req: Request) {
  try {
    const uid = await requireApiUser();
    const u = new URL(req.url);
    const q = u.searchParams.get("q") || u.searchParams.get("query") || "";
    if (!q.trim()) throw new ApiError(400, "Pass q with title words, e.g. ?q=ai+agents+platform&location=India");
    const boards = (u.searchParams.get("boards") || "").split(",").filter((b): b is "greenhouse" | "lever" | "ashby" => ["greenhouse", "lever", "ashby"].includes(b));
    return json(await findJobs(uid, { query: q, location: u.searchParams.get("location") || undefined, limit: Number(u.searchParams.get("limit") || 30), boards: boards.length ? boards : undefined }));
  } catch (e) { return fail(e); }
}
