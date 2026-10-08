"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { randomBytes } from "node:crypto";
import { requireUserId, userEmail } from "@/lib/auth";
import { getApplication, saveApplication, deleteApplication, saveProfile, getProfile, getSettings, saveSettings, saveRunnerToken, deleteRunnerToken, userForRunnerToken, saveApiKey, deleteApiKey, listApplications, applyResumeChoice, saveFile, type Application } from "@/lib/store";
import { Profile, Settings } from "@/lib/profile/types";
import { scheduleProcessing } from "@/lib/apply/schedule";
import { draftAnswers } from "@/lib/apply/draft";
import { fetchJob } from "@/lib/jobs/fetch";
import { companyFromUrl, addUserCompany } from "@/lib/jobs/boards";
import { pdfToText, textToProfile } from "@/lib/profile/import";
import { mergeProfiles } from "@/lib/profile/merge";
import { withProfileFallback } from "@/lib/apply/answers";
import { answerGaps, profileGaps } from "@/lib/onboarding";
import { LABEL } from "@/components/status";
import { learnAnswers, refreshOpenWithBank } from "@/lib/apply/learn";
import { getBank, saveBank } from "@/lib/apply/bank";
import { isTemplateId, templateInfo } from "@/lib/resume/templates";
import { parseEdited, rewriteBullet } from "@/lib/resume/edit";
import { renderPdf } from "@/lib/resume/render";
import { validate } from "@/lib/resume/tailor";
import { resumeProfileFor } from "@/lib/apply/pipeline";
import { launchBrowser } from "@/lib/browser";
import { ensureJobDescription, rescore } from "@/lib/apply/match-repair";
import { approveLink, linkForCode } from "@/lib/runner-link";

export async function createApplicationAction(formData: FormData) {
  const userId = await requireUserId();
  // Every resume is written from the profile, so there is nothing to prepare without one.
  if (!(await getProfile(userId))) redirect("/profile?welcome=1&need=resume");
  const url = String(formData.get("url") || "").trim();
  if (!/^https?:\/\//.test(url)) redirect("/dashboard?error=url");
  const id = nanoid(10);
  const now = new Date().toISOString();
  const app: Application = { id, userId, url, createdAt: now, updatedAt: now, status: "queued", questions: [] };
  await saveApplication(app);
  scheduleProcessing(userId, id);
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
    scheduleProcessing(userId, id);
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
    if (typeof v !== "string") continue;
    const changed = v.trim() !== (q.answer || "");
    // Saving the page confirms AI drafts as they stand; an edited draft becomes the user's own answer.
    if (changed || (q.source === "ai" && q.needsHuman && v.trim())) {
      const acceptedDraft = !changed && q.source === "ai";
      q.answer = v.trim() || undefined; q.source = v.trim() ? "user" : undefined; q.needsHuman = !v.trim() && q.required;
      q.fromDraft = acceptedDraft || (q.fromDraft && !changed) || undefined;
    }
  }
  await saveApplication(app);
  // Remember these answers and fill the same questions on the other open applications.
  await learnAnswers(userId, app, withProfileFallback(Settings.parse((await getSettings(userId)) ?? {}), await getProfile(userId)));
  revalidatePath(`/a/${id}`);
  redirect(`/a/${id}?saved=1`);
}

export async function approveAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const app = await getApplication(userId, id);
    if (!app) return { ok: false, error: "This application no longer exists." };
    if (app.status !== "ready") return { ok: false, error: `Cannot approve while it is ${LABEL[app.status].toLowerCase()}.` };
    const drafts = app.questions.filter((q) => q.source === "ai" && q.needsHuman).length;
    if (drafts) return { ok: false, error: `${drafts} AI draft${drafts > 1 ? "s" : ""} still need your confirmation. Edit or accept them first.` };
    app.status = "approved"; app.approvedAt = new Date().toISOString();
    await saveApplication(app);
    revalidatePath("/", "layout");
    return { ok: true, message: "Approved. The runner on your machine fills the form next; make sure it is running (npx lazy-apply, set-up steps on the Runner page)." };
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
    // Greenhouse codes are case-sensitive: keep the letters exactly as typed, only strip spaces and dashes.
    const clean = code.replace(/[\s-]/g, "");
    if (!/^[A-Za-z0-9]{6,10}$/.test(clean)) return { ok: false, error: "The code is 8 letters and digits, exactly as written in the Greenhouse email (case matters)." };
    app.verificationCode = clean; await saveApplication(app);
    revalidatePath("/", "layout");
    return { ok: true, message: "Code saved. The runner enters it within a few seconds." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the code." };
  }
}

/** The code expired or the tab was closed: ask the runner to refill and submit again so Greenhouse sends a new code. */
export async function requestNewCodeAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const app = await getApplication(userId, id);
    if (!app) return { ok: false, error: "This application no longer exists." };
    if (app.status !== "code_required") return { ok: false, error: "This application is not waiting for a code." };
    app.status = "submit_requested"; app.verificationCode = undefined; app.error = undefined; app.codeRequestedAt = undefined;
    app.runnerNotes = [...(app.runnerNotes || []), "New code requested: the runner refills the form and submits again"].slice(-30);
    await saveApplication(app);
    revalidatePath("/", "layout");
    return { ok: true, message: "The runner refills the form and submits again. Greenhouse emails a fresh code in about a minute." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not request a new code." };
  }
}

/** Switch between the tailored resume and the full one for an application that has not been filled yet. */
export async function chooseResumeAction(id: string, choice: "tailored" | "full"): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const app = await getApplication(userId, id);
    if (!app) return { ok: false, error: "This application no longer exists." };
    if (!app.variants) return { ok: false, error: "This application predates the two-version resume. Regenerate it to get both." };
    if (!["ready", "approved"].includes(app.status)) return { ok: false, error: `The resume is locked once the form is ${LABEL[app.status].toLowerCase()}.` };
    if (app.resumeChoice === choice) return { ok: true };
    applyResumeChoice(app, choice);
    if (app.status === "approved") { app.status = "ready"; app.approvedAt = undefined; }
    await saveApplication(app);
    revalidatePath("/", "layout");
    return { ok: true, message: choice === "full" ? "Original resume selected." : "Tailored resume selected." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not switch the resume." };
  }
}

/** Rewrite one drafted answer with the user's instructions, like Regenerate for the resume. */
export async function redraftAction(id: string, questionId: string, notes?: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const app = await getApplication(userId, id);
    if (!app) return { ok: false, error: "This application no longer exists." };
    const q = app.questions.find((x) => x.id === questionId);
    if (!q) return { ok: false, error: "That question is no longer on the form." };
    const profile = await getProfile(userId);
    if (!profile) return { ok: false, error: "Add your profile first." };
    const job = await fetchJob(app.url);
    const settings = withProfileFallback(Settings.parse((await getSettings(userId)) ?? {}), profile);
    const n = await draftAnswers(job, profile, app.questions, settings, { id: questionId, notes });
    if (!n) return { ok: false, error: "Could not write a supported answer for that question from your profile. Type it yourself, or add the relevant facts to your profile." };
    await saveApplication(app);
    revalidatePath(`/a/${id}`);
    return { ok: true, message: "Rewritten. Read it, then save or accept." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not rewrite the answer." };
  }
}

/** The country the user wants roles in; Discover asks for it once and uses it for suggestions. */
export async function setSearchCountryAction(formData: FormData) {
  const userId = await requireUserId();
  const country = String(formData.get("country") || "").trim().slice(0, 60);
  if (!country) redirect("/discover");
  const current = Settings.parse((await getSettings(userId)) ?? {});
  await saveSettings(userId, { ...current, workAuthorizedCountries: current.workAuthorizedCountries || country });
  revalidatePath("/discover");
  redirect(`/discover?location=${encodeURIComponent(`${country}, Remote`)}`);
}

/** Add a company's Greenhouse, Lever or Ashby board to the user's Discover list. */
export async function addCompanyAction(formData: FormData) {
  const userId = await requireUserId();
  const url = String(formData.get("careersUrl") || "").trim();
  const c = companyFromUrl(url);
  if (!c) redirect(`/discover?error=${encodeURIComponent("That is not a Greenhouse, Lever or Ashby careers URL. Examples: jobs.ashbyhq.com/acme, boards.greenhouse.io/acme, jobs.lever.co/acme.")}`);
  await addUserCompany(userId, c);
  revalidatePath("/discover");
  redirect(`/discover?added=${encodeURIComponent(c.name)}`);
}

/** Accept every AI draft on an application as-is. */
export async function acceptDraftsAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const app = await getApplication(userId, id);
    if (!app) return { ok: false, error: "This application no longer exists." };
    let n = 0;
    for (const q of app.questions) if (q.source === "ai" && q.needsHuman && q.answer) { q.source = "user"; q.fromDraft = true; q.needsHuman = false; n++; }
    if (!n) return { ok: false, error: "No AI drafts are waiting for confirmation." };
    await saveApplication(app);
    revalidatePath("/", "layout");
    return { ok: true, message: `${n} draft${n > 1 ? "s" : ""} accepted.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not accept the drafts." };
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
  await refreshOpenWithBank(userId, settings);
}

export async function saveProfileAction(formData: FormData) {
  const userId = await requireUserId();
  const raw = String(formData.get("profile") || "");
  let parsed;
  try { parsed = Profile.parse(JSON.parse(raw)); } catch (e) { redirect(`/profile?error=${encodeURIComponent((e as Error).message.slice(0, 200))}`); }
  await saveProfile(userId, parsed);
  await seedAnswersFromProfile(userId, parsed, await userEmail());
  revalidatePath("/", "layout");
  // A complete profile moves on to the answers; an incomplete one stays and says what is missing.
  const gaps = profileGaps(parsed);
  redirect(gaps.length ? `/profile?saved=1&missing=${encodeURIComponent(gaps.join(", "))}` : "/answers?from=profile");
}

export async function saveSettingsAction(formData: FormData) {
  const userId = await requireUserId();
  const current = Settings.parse((await getSettings(userId)) ?? {});
  const next: Record<string, string> = {};
  for (const key of Object.keys(Settings.shape)) { const v = formData.get(key); if (typeof v === "string") next[key] = v.trim(); }
  const saved = Settings.parse({ ...current, ...next });
  await saveSettings(userId, saved);
  const profile = await getProfile(userId);
  const known = withProfileFallback(saved, profile, await userEmail());
  await refreshOpenApplications(userId, known);
  revalidatePath("/", "layout");
  // With the essentials answered there is nothing left to set up: go find roles.
  const gaps = answerGaps(known);
  redirect(gaps.length || !profile ? `/answers?saved=1${gaps.length ? `&missing=${encodeURIComponent(gaps.join(", "))}` : ""}` : "/discover?from=answers");
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

/** Personal API key for the connector API (custom connectors, scripts). MCP clients sign in with OAuth instead. */
export async function rotateApiKeyAction(): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const current = Settings.parse((await getSettings(userId)) ?? {});
    if (current.apiKey) await deleteApiKey(current.apiKey);
    const key = randomBytes(24).toString("base64url");
    await saveApiKey(key, userId);
    await saveSettings(userId, { ...current, apiKey: key });
    revalidatePath("/connect");
    return { ok: true, message: current.apiKey ? "New API key generated. The old one no longer works." : "API key generated." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not generate a key." };
  }
}

export async function revokeApiKeyAction(): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const current = Settings.parse((await getSettings(userId)) ?? {});
    if (current.apiKey) await deleteApiKey(current.apiKey);
    await saveSettings(userId, { ...current, apiKey: "" });
    revalidatePath("/connect");
    return { ok: true, message: "API key revoked." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not revoke the key." };
  }
}

/** Approve every ready application whose questions are all answered. The runner fills them one by one. */
export async function approveAllAction(): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const apps = (await listApplications(userId)).filter((a) => a.status === "ready" && !a.questions.some((q) => q.needsHuman));
    if (!apps.length) return { ok: false, error: "Nothing to approve: every ready application still has an open question, or none is ready." };
    const now = new Date().toISOString();
    await Promise.all(apps.map((a) => { a.status = "approved"; a.approvedAt = now; return saveApplication(a); }));
    revalidatePath("/", "layout");
    return { ok: true, message: `Approved ${apps.length} application${apps.length > 1 ? "s" : ""}. The runner fills them next.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not approve." };
  }
}

/** Retry every failed application: refill when the resume exists, prepare again when it does not. */
export async function retryFailedAction(): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const apps = (await listApplications(userId)).filter((a) => a.status === "failed");
    if (!apps.length) return { ok: false, error: "Nothing has failed." };
    let refill = 0, redo = 0;
    for (const a of apps) {
      a.error = undefined;
      if (a.resumePdfUrl && a.job) {
        const open = a.questions.some((q) => q.needsHuman);
        a.status = open ? "ready" : "approved"; a.approvedAt = open ? undefined : new Date().toISOString(); refill++;
      } else { a.status = "queued"; redo++; scheduleProcessing(userId, a.id); }
      await saveApplication(a);
    }
    revalidatePath("/", "layout");
    return { ok: true, message: [refill ? `${refill} sent back to the runner to fill again` : "", redo ? `${redo} being prepared again` : ""].filter(Boolean).join("; ") + "." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not retry." };
  }
}

/** Request Submit on every filled application. Check the screenshots first; this presses the real Submit button. */
export async function submitAllAction(): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const apps = (await listApplications(userId)).filter((a) => a.status === "filled");
    if (!apps.length) return { ok: false, error: "No filled applications are waiting for Submit." };
    await Promise.all(apps.map((a) => { a.status = "submit_requested"; return saveApplication(a); }));
    revalidatePath("/", "layout");
    return { ok: true, message: `Submit requested for ${apps.length} application${apps.length > 1 ? "s" : ""}. The runner presses Submit on each live form.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not request the submits." };
  }
}


/** The user closed the paid-plan offer; it is not shown again. */
export async function dismissPlanOfferAction() {
  const userId = await requireUserId();
  const s = Settings.parse((await getSettings(userId)) ?? {});
  await saveSettings(userId, { ...s, planOfferSeenAt: new Date().toISOString() });
}

/** Edit or remove answers in the answer bank; open applications pick the change up at once. */
export async function saveBankAction(formData: FormData) {
  const userId = await requireUserId();
  const bank = await getBank(userId);
  const remove = formData.get("delete");
  if (typeof remove === "string" && remove) delete bank[remove];
  else for (const key of Object.keys(bank)) {
    const v = formData.get(`bank:${key}`);
    if (typeof v !== "string") continue;
    if (!v.trim()) delete bank[key];
    else if (v.trim() !== bank[key].answer) bank[key] = { ...bank[key], answer: v.trim(), updatedAt: new Date().toISOString() };
  }
  await saveBank(userId, bank);
  await refreshOpenWithBank(userId, withProfileFallback(Settings.parse((await getSettings(userId)) ?? {}), await getProfile(userId)), bank);
  revalidatePath("/", "layout");
  redirect(`/answers?bank=${typeof remove === "string" && remove ? "removed" : "1"}#saved`);
}

/** The template every new application is rendered with. Existing PDFs keep theirs until edited or regenerated. */
export async function setTemplateAction(template: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    if (!isTemplateId(template)) return { ok: false, error: "Unknown template." };
    const current = Settings.parse((await getSettings(userId)) ?? {});
    await saveSettings(userId, { ...current, resumeTemplate: template });
    revalidatePath("/", "layout");
    return { ok: true, message: `${templateInfo(template).name} is now your default template.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the template." };
  }
}

/**
 * Save the editor's version of the active resume. Both versions are re-rendered with the chosen
 * template, so switching between tailored and original keeps the same look. No model call.
 */
export async function saveResumeEditAction(id: string, input: { resume: unknown; template: string }): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const app = await getApplication(userId, id);
    if (!app?.job || !app.variants) return { ok: false, error: "This application has no resume to edit yet." };
    if (!["ready", "approved", "failed", "filled"].includes(app.status)) return { ok: false, error: `The resume is locked while the application is ${LABEL[app.status].toLowerCase()}.` };
    if (!isTemplateId(input.template)) return { ok: false, error: "Unknown template." };
    const parsed = parseEdited(input.resume);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const profile = await getProfile(userId);
    if (!profile) return { ok: false, error: "Add your profile first." };
    const choice = app.resumeChoice || "tailored";
    const other = choice === "tailored" ? "full" : "tailored";
    // A template change alone keeps the score: the words did not change. Real edits are rescored against the full posting.
    const stored = parseEdited(app.variants[choice].resume);
    const sameWords = stored.ok && JSON.stringify(parsed.resume) === JSON.stringify(stored.resume);
    const jd = sameWords ? (app.jobDescription || app.job.descriptionPreview || "") : await ensureJobDescription(app);
    const renderProfile = resumeProfileFor(profile, app.job.title, jd);
    let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;
    const shared = async () => {
      browser ??= await launchBrowser();
      return new Proxy(browser, { get: (t, k) => (k === "close" ? async () => {} : Reflect.get(t, k as keyof typeof t)) });
    };
    try {
      const stamp = Date.now().toString(36);
      const [mine, theirs] = await Promise.all([
        renderPdf(parsed.resume, renderProfile, shared, input.template),
        app.template === input.template ? null : renderPdf(app.variants[other].resume, renderProfile, shared, input.template)
      ]);
      // A fresh path per save: the Blob CDN may keep serving an overwritten file for a while.
      const mineUrl = await saveFile(`users/${userId}/resumes/${id}-${choice}-${stamp}.pdf`, mine.pdf, "application/pdf");
      app.variants[choice] = { ...app.variants[choice], resume: mine.resume, pdfUrl: mineUrl, trims: mine.trims, scale: mine.scale, match: sameWords ? app.variants[choice].match : rescore(jd, mine.resume, profile, app.job.company, app.variants[choice].match) };
      if (theirs) app.variants[other] = { ...app.variants[other], pdfUrl: await saveFile(`users/${userId}/resumes/${id}-${other}-${stamp}.pdf`, theirs.pdf, "application/pdf"), trims: theirs.trims, scale: theirs.scale };
      app.template = input.template;
      app.editedAt = new Date().toISOString();
      applyResumeChoice(app, choice);
      app.resumeWarnings = validate(mine.resume, profile).map((w) => w.replace(/ in master/, " in your profile"));
      const wasApproved = app.status === "approved";
      const wasFilled = app.status === "filled";
      if (wasApproved) { app.status = "ready"; app.approvedAt = undefined; }
      // The open form has the old PDF attached: send it back to the runner, which refills it with the new one.
      if (wasFilled) { app.status = "approved"; app.error = undefined; }
      await saveApplication(app);
      revalidatePath(`/a/${id}`);
      const trimmed = mine.trims.length ? ` To fit one page: ${mine.trims.join(", ")}.` : "";
      return { ok: true, message: `Saved. Match ${app.match?.tailored ?? 0}%.${trimmed}${wasApproved ? " Approval was cleared; approve again." : ""}${wasFilled ? " The runner refills the form with the new PDF; press Submit when it is filled again." : ""}` };
    } finally {
      await (browser as Awaited<ReturnType<typeof launchBrowser>> | null)?.close().catch(() => {});
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the resume." };
  }
}

/** AI rewrite of one bullet in the editor. Returns the text; nothing is saved until the user saves. */
export async function rewriteBulletAction(id: string, bullet: string, instruction?: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const userId = await requireUserId();
    const [app, profile] = await Promise.all([getApplication(userId, id), getProfile(userId)]);
    if (!app?.job) return { ok: false, error: "This application no longer exists." };
    if (!profile) return { ok: false, error: "Add your profile first." };
    if (bullet.trim().length < 10) return { ok: false, error: "Write a few words first, then rewrite them." };
    const text = await rewriteBullet(bullet.slice(0, 600), profile, { instruction, jobTitle: `${app.job.title} at ${app.job.company}`, jd: app.jobDescription || app.job.descriptionPreview });
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not rewrite the bullet." };
  }
}

/** Re-render this application's resume in another template. No model call: the content stays, only the layout changes. */
export async function applyTemplateAction(id: string, template: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const app = await getApplication(userId, id);
    if (!app?.resume) return { ok: false, error: "This application has no resume yet." };
    if (app.template === template) return { ok: true };
    return await saveResumeEditAction(id, { resume: app.resume, template });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not switch the template." };
  }
}

/** Approve a "connect this computer" code from `npx lazy-apply`. Reuses the account's runner token if it has one. */
export async function approveRunnerLinkAction(code: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const found = await linkForCode(code);
    if (!found) return { ok: false, error: "This code has expired or was already used. Run npx lazy-apply again for a new one." };
    const current = Settings.parse((await getSettings(userId)) ?? {});
    let token = current.runnerToken;
    if (!token || !(await userForRunnerToken(token))) {
      token = randomBytes(24).toString("base64url");
      await saveRunnerToken(token, userId);
      await saveSettings(userId, { ...current, runnerToken: token });
    }
    await approveLink(found.secret, userId, token, (await userEmail()) || "");
    revalidatePath("/runner");
    return { ok: true, message: "Connected. Go back to your terminal; the runner is starting." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not connect this computer." };
  }
}
