import { authorized } from "@/lib/auth";
import { getApplication } from "@/lib/store";
import { readFileSync } from "node:fs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorized())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const app = await getApplication(id);
  if (!app?.resumePdfUrl) return new Response("Not found", { status: 404 });
  const body = app.resumePdfUrl.startsWith("file://")
    ? new Uint8Array(readFileSync(app.resumePdfUrl.slice(7)))
    : new Uint8Array(await (await fetch(app.resumePdfUrl, { cache: "no-store" })).arrayBuffer());
  return new Response(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Vikash_Maddi_${app.job?.company || "resume"}.pdf"`, "Cache-Control": "no-store" } });
}
