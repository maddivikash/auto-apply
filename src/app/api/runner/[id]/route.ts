import { runnerUserId } from "@/lib/auth";
import { getApplication, saveApplication, saveFile, getSettings, addNotification, type ApplicationStatus } from "@/lib/store";
import { Settings } from "@/lib/profile/types";
import { emailFormFilled, emailSubmitted } from "@/lib/email";

const ALLOWED: ApplicationStatus[] = ["filling", "filled", "submitted", "failed", "approved"];

/** Runner reports progress: status changes, notes, discovered questions, and the screenshot. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await runnerUserId();
  if (!uid) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const app = await getApplication(uid, id);
  if (!app) return new Response("Not found", { status: 404 });
  const body = (await req.json()) as { status?: ApplicationStatus; notes?: string[]; screenshotBase64?: string; error?: string; questions?: { label: string; required: boolean; type: string; options?: string[] }[] };
  const settings = Settings.parse((await getSettings(uid)) ?? {});
  const to = settings.notifyEmail || settings.email;

  if (body.screenshotBase64) app.filledScreenshotUrl = await saveFile(`users/${uid}/screenshots/${id}-${Date.now()}.png`, Buffer.from(body.screenshotBase64, "base64"), "image/png");
  if (body.notes?.length) app.runnerNotes = [...(app.runnerNotes || []), ...body.notes].slice(-30);
  if (body.questions?.length) {
    const known = new Set(app.questions.map((q) => q.label.toLowerCase()));
    for (const q of body.questions) if (!known.has(q.label.toLowerCase())) app.questions.push({ id: q.label, label: q.label, required: q.required, type: q.type as any, options: q.options, needsHuman: true });
  }
  if (body.error) app.error = body.error;
  if (body.status && ALLOWED.includes(body.status)) {
    app.status = body.status;
    if (body.status === "submitted") { app.submittedAt = new Date().toISOString(); await saveApplication(app); await addNotification({ userId: uid, kind: "submitted", applicationId: id, title: `Submitted to ${app.job?.company}` }); await emailSubmitted(to, app); }
    else if (body.status === "filled") { await saveApplication(app); await addNotification({ userId: uid, kind: "filled", applicationId: id, title: `${app.job?.company} form is filled`, body: "Check the screenshot, then press Submit." }); await emailFormFilled(to, app); }
    else if (body.status === "failed") await addNotification({ userId: uid, kind: "failed", applicationId: id, title: `Filling failed for ${app.job?.company}`, body: body.error });
  }
  await saveApplication(app);
  return Response.json({ ok: true, application: app });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await runnerUserId();
  if (!uid) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const app = await getApplication(uid, id);
  return app ? Response.json(app) : new Response("Not found", { status: 404 });
}
