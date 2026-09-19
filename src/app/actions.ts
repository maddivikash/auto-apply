"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { nanoid } from "nanoid";
import { randomBytes } from "node:crypto";
import { requireUserId, userEmail } from "@/lib/auth";
import { getApplication, saveApplication, deleteApplication, saveProfile, getProfile, getSettings, saveSettings, saveRunnerToken, deleteRunnerToken, markNotificationsRead, listApplications, type Application } from "@/lib/store";
import { Profile, Settings } from "@/lib/profile/types";
import { processApplication } from "@/lib/apply/pipeline";
import { pdfToText, textToProfile } from "@/lib/profile/import";
import { mergeProfiles } from "@/lib/profile/merge";
import { ANSWERS_MATTER, refreshAnswers, withProfileFallback } from "@/lib/apply/answers";
import { LABEL } from "@/components/status";

export async function createApplicationAction(formData: FormData) {
  const userId = await requireUserId();
  const url = String(formData.get("url") || "").trim();
  if (!/^https?:\/\//.test(url)) redirect("/dashboard?error=url");
  const id = nanoid(10);
  const now = new Date().toISOString();
  const app: Application = { id, userId, url, createdAt: now, updatedAt: now, status: "queued", questions: [] };
  await saveApplication(app);
  after(() => processApplication(userId, id));
  revalidatePath("/", "layout");
  redirect(`/a/${id}`);
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/** Re-run the pipeline for one application. Returns a result instead of redirecting so the page can update in place. */
const PROCESSING: Application["status"][] = ["queued", "fetching", "tailoring", "rendering", "filling", "submit_requested"];

export async function reprocessAction(id: string, notes?: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const app = await getApplication(userId, id);
    if (!app) return { ok: false, error: "This application no longer exists." };
    if (PROCESSING.includes(app.status)) return { ok: false, error: `It is ${LABEL[app.status].toLowerCase()} right now. Wait for it to finish, this page updates on its own.` };
    const wasApproved = app.status === "approved";
    app.revisionNotes = notes?.trim() || undefined;
    app.status = "queued"; app.error = undefined; app.approvedAt = undefined; await saveApplication(app);
    after(() => processApplication(userId, id));
    revalidatePath("/", "layout");
    return { ok: true, message: (app.revisionNotes ? "Rewriting with your notes. " : "Preparing again. ") + (wasApproved ? "Approval was cleared; approve again when the new version is ready." : "The resume usually takes about a minute.") };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start the retry." };
  }
}

export async function saveAnswersAction(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id"));
  const app = await getApplication(userId, id);
  if (!app) redirect("/dashboard");
  for (const q of app.questions) {
    const v = formData.get(`q:${q.id}`);
    if (typeof v === "string" && v.trim() !== (q.answer || "")) { q.answer = v.trim() || undefined; q.source = v.trim() ? "user" : undefined; q.needsHuman = !v.trim() && q.required; }
  }
  await saveApplication(app);
  revalidatePath(`/a/${id}`);
  redirect(`/a/${id}?saved=1`);
}

export async function approveAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const app = await getApplication(userId, id);
    if (!app) return { ok: false, error: "This application no longer exists." };
    if (app.status !== "ready") return { ok: false, error: `Cannot approve while it is ${LABEL[app.status].toLowerCase()}.` };
    app.status = "approved"; app.approvedAt = new Date().toISOString();
    await saveApplication(app);
    revalidatePath("/", "layout");
    return { ok: true, message: "Approved. The runner on your machine will fill the form next." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not approve." };
  }
}

/** The only path to a real submission. Requires the runner to have filled the form first. */
export async function requestSubmitAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const app = await getApplication(userId, id);
    if (!app) return { ok: false, error: "This application no longer exists." };
    if (app.status !== "filled") return { ok: false, error: "The runner has to fill the form before you can submit." };
    app.status = "submit_requested"; await saveApplication(app);
    revalidatePath("/", "layout");
    return { ok: true, message: "Submit requested. The runner presses Submit on the live form." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not request the submit." };
  }
}

/** The user finished the submit themselves in the runner's browser window (for example typed the code there). */
export async function markSubmittedAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const app = await getApplication(userId, id);
    if (!app) return { ok: false, error: "This application no longer exists." };
    if (!["filled", "submit_requested", "code_required", "failed"].includes(app.status)) return { ok: false, error: `Cannot mark a ${LABEL[app.status].toLowerCase()} application as submitted.` };
    app.status = "submitted"; app.submittedAt = new Date().toISOString(); app.verificationCode = undefined; app.error = undefined;
    app.runnerNotes = [...(app.runnerNotes || []), "Marked as submitted by you"].slice(-30);
    await saveApplication(app);
    revalidatePath("/", "layout");
    return { ok: true, message: "Marked as submitted." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update the application." };
  }
}

/** The user types the code Greenhouse emailed them; the runner picks it up on its next poll. */
export async function submitCodeAction(id: string, code: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const app = await getApplication(userId, id);
    if (!app) return { ok: false, error: "This application no longer exists." };
    if (app.status !== "code_required") return { ok: false, error: "This application is not waiting for a code right now." };
    const clean = code.replace(/[\s-]/g, "").toUpperCase();
    if (!/^[A-Z0-9]{6,10}$/.test(clean)) return { ok: false, error: "The code is 8 letters and digits, as in the Greenhouse email." };
    app.verificationCode = clean; await saveApplication(app);
    revalidatePath("/", "layout");
    return { ok: true, message: "Code saved. The runner enters it within a few seconds." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the code." };
  }
}

export async function deleteAction(formData: FormData) {
  const userId = await requireUserId();
  await deleteApplication(userId, String(formData.get("id")));
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// ---- profile ---------------------------------------------------------------

export async function importResumeAction(formData: FormData) {
  const userId = await requireUserId();
  const files = formData.getAll("resume").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 4);
  if (files.length === 0) redirect("/profile?error=file");
  const mode = formData.get("mode") === "replace" ? "replace" : "merge";
  let profile: Profile;
  try {
    // Read every file, then structure each one with the model in parallel. One bad file fails the whole import with its name.
    const texts = await Promise.all(files.map(async (file) => {
      const text = file.type === "application/pdf" || file.name.endsWith(".pdf") ? await pdfToText(new Uint8Array(await file.arrayBuffer())) : await file.text();
      if (text.length < 200) throw new Error(`${file.name} had no readable text. Use a text-based PDF.`);
      return text;
    }));
    const parsed = await Promise.all(texts.map((t) => textToProfile(t)));
    const existing = mode === "merge" ? await getProfile(userId) : null;
    const start = existing ? Profile.parse(existing) : parsed.shift()!;
    profile = parsed.reduce((acc, p) => mergeProfiles(acc, p), start);
  } catch (e) {
    if ((e as Error)?.message === "NEXT_REDIRECT" || String((e as { digest?: string })?.digest || "").startsWith("NEXT_REDIRECT")) throw e;
    redirect(`/profile?error=${encodeURIComponent(`Could not read ${files.length > 1 ? "those resumes" : "that resume"}: ${(e as Error).message.slice(0, 160)}`)}`);
  }
  const email = await userEmail();
  if (!profile.email && email) profile.email = email;
  await saveProfile(userId, profile);
  await seedAnswersFromProfile(userId, profile, email);
  revalidatePath("/", "layout");
  redirect(`/profile?imported=${files.length}&mode=${mode}`);
}

/** Fill the Answers page blanks from the profile, then bring every open application up to date. */
async function seedAnswersFromProfile(userId: string, profile: Profile, email: string | null) {
  const current = Settings.parse((await getSettings(userId)) ?? {});
  const seeded = withProfileFallback(current, profile, email);
  await saveSettings(userId, seeded);
  await refreshOpenApplications(userId, seeded);
}

/** Re-derive rule answers on every application that is not done yet, so filled-in details stop being asked. */
async function refreshOpenApplications(userId: string, settings: Settings) {
  const apps = (await listApplications(userId)).filter(ANSWERS_MATTER);
  await Promise.all(apps.filter((a) => refreshAnswers(a, settings)).map((a) => saveApplication(a)));
}

export async function saveProfileAction(formData: FormData) {
  const userId = await requireUserId();
  const raw = String(formData.get("profile") || "");
  let parsed;
  try { parsed = Profile.parse(JSON.parse(raw)); } catch (e) { redirect(`/profile?error=${encodeURIComponent((e as Error).message.slice(0, 200))}`); }
  await saveProfile(userId, parsed);
  await seedAnswersFromProfile(userId, parsed, await userEmail());
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  redirect("/profile?saved=1");
}

export async function saveSettingsAction(formData: FormData) {
  const userId = await requireUserId();
  const current = Settings.parse((await getSettings(userId)) ?? {});
  const next: Record<string, string> = {};
  for (const key of Object.keys(Settings.shape)) { const v = formData.get(key); if (typeof v === "string") next[key] = v.trim(); }
  const saved = Settings.parse({ ...current, ...next });
  await saveSettings(userId, saved);
  await refreshOpenApplications(userId, withProfileFallback(saved, await getProfile(userId)));
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  redirect("/answers?saved=1");
}

export async function rotateRunnerTokenAction(): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const current = Settings.parse((await getSettings(userId)) ?? {});
    if (current.runnerToken) await deleteRunnerToken(current.runnerToken);
    const token = randomBytes(24).toString("base64url");
    await saveRunnerToken(token, userId);
    await saveSettings(userId, { ...current, runnerToken: token });
    revalidatePath("/runner");
    return { ok: true, message: current.runnerToken ? "New token generated. The old one no longer works; update .env.local on the runner machine." : "Token generated. Copy it into .env.local on the runner machine." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not generate a token." };
  }
}

export async function markAllReadAction() {
  const userId = await requireUserId();
  await markNotificationsRead(userId);
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  redirect("/notifications");
}
