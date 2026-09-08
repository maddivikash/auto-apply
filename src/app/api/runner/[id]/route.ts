import { isRunner } from "@/lib/auth";
import { getApplication, saveApplication, saveFile, type ApplicationStatus } from "@/lib/store";
import { emailFormFilled, emailSubmitted } from "@/lib/email";

const ALLOWED: ApplicationStatus[] = ["filling", "filled", "submitted", "failed", "approved"];

/** Runner reports progress: status changes, notes, and the screenshot of the filled form. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRunner())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const app = await getApplication(id);
  if (!app) return new Response("Not found", { status: 404 });
  const body = await req.json() as { status?: ApplicationStatus; notes?: string[]; screenshotBase64?: string; error?: string; questions?: { label: string; required: boolean; type: string; options?: string[] }[] };

  if (body.screenshotBase64) {
    app.filledScreenshotUrl = await saveFile(`screenshots/${id}-${Date.now()}.png`, Buffer.from(body.screenshotBase64, "base64"), "image/png");
  }
  if (body.notes?.length) app.runnerNotes = [...(app.runnerNotes || []), ...body.notes].slice(-30);
  if (body.questions?.length) {
    // Lever and Ashby: the runner discovered the real form fields.
    const known = new Set(app.questions.map((q) => q.label));
    for (const q of body.questions) if (!known.has(q.label)) app.questions.push({ id: q.label, label: q.label, required: q.required, type: q.type as any, options: q.options, needsHuman: true });
  }
  if (body.error) app.error = body.error;
  if (body.status && ALLOWED.includes(body.status)) {
    app.status = body.status;
    if (body.status === "submitted") { app.submittedAt = new Date().toISOString(); await saveApplication(app); await emailSubmitted(app); }
    else if (body.status === "filled") { await saveApplication(app); await emailFormFilled(app); }
  }
  await saveApplication(app);
  return Response.json({ ok: true, application: app });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRunner())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const app = await getApplication(id);
  return app ? Response.json(app) : new Response("Not found", { status: 404 });
}
