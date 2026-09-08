import { userId, runnerUserId } from "@/lib/auth";
import { getApplication, readFileUrl } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = (await userId()) || (await runnerUserId());
  if (!uid) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const app = await getApplication(uid, id);
  if (!app?.resumePdfUrl) return new Response("Not found", { status: 404 });
  const body = await readFileUrl(app.resumePdfUrl);
  return new Response(new Blob([body as BlobPart]), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Resume_${app.job?.company || "tailored"}.pdf"`, "Cache-Control": "no-store" } });
}
