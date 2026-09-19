import { requireApiUser, json, fail, ApiError } from "@/lib/api/auth";
import { importResumeText } from "@/lib/api/connector";

export const maxDuration = 120;

/** Build the profile from resume text. Send JSON { text, mode? } or the raw text with Content-Type text/plain. */
export async function POST(req: Request) {
  try {
    const uid = await requireApiUser();
    const ct = req.headers.get("content-type") || "";
    let text = "", mode: "merge" | "replace" = "merge";
    if (ct.includes("application/json")) { const b = (await req.json()) as { text?: string; mode?: string }; text = b.text || ""; if (b.mode === "replace") mode = "replace"; }
    else text = await req.text();
    if (!text) throw new ApiError(400, "Send the resume text as JSON { text } or as text/plain.");
    return json(await importResumeText(uid, text, mode));
  } catch (e) { return fail(e); }
}
