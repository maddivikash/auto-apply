import { apiUserId } from "@/lib/api/auth";
import { verifySignedPdf } from "@/lib/api/sign";
import { getApplication, getProfile, readFileUrl } from "@/lib/store";
import { resumeFileName } from "@/lib/resume/filename";

/** The tailored PDF. Accepts a bearer token or a signed link (24 h) so a browser or form uploader can fetch it. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = verifySignedPdf(new URL(req.url), id) || (await apiUserId());
  if (!uid) return new Response("Unauthorized", { status: 401 });
  const app = await getApplication(uid, id);
  if (!app?.resumePdfUrl) return new Response("Not found", { status: 404 });
  const [body, profile] = await Promise.all([readFileUrl(app.resumePdfUrl), getProfile(uid)]);
  return new Response(new Blob([body as BlobPart]), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${resumeFileName(profile?.name)}"`, "Cache-Control": "no-store" } });
}
