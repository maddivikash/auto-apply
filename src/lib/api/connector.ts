/**
 * The connector surface: what an agent (Muse, Claude, ChatGPT, a script) can do with a user's
 * account. Both the MCP server and the REST API call these, so the two never drift.
 *
 * The split with Muse in mind: we bring the API (the tailored resume and every form answer),
 * the agent brings the browser. So an agent can either fill the form itself from `formAnswers`
 * and then `markSubmitted`, or hand off to the user's desktop runner with `approve`.
 */
import { after } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getApplication, saveApplication, deleteApplication, listApplications, getProfile, saveProfile, getSettings, saveSettings, type Application, type ApplicationStatus } from "../store";
import { Profile, Settings } from "../profile/types";
import { processApplication } from "../apply/pipeline";
import { ANSWERS_MATTER, refreshAnswers, withProfileFallback } from "../apply/answers";
import { textToProfile } from "../profile/import";
import { mergeProfiles } from "../profile/merge";
import { signedPdfUrl } from "./sign";
import { ApiError } from "./auth";
import { LABEL } from "@/components/status";

const PROCESSING: ApplicationStatus[] = ["queued", "fetching", "tailoring", "rendering", "filling", "submit_requested"];

/** Run the pipeline once the response is out. Falls back to fire-and-forget outside a request scope. */
function schedule(fn: () => Promise<void>) {
  try { after(fn); } catch { void fn().catch((e) => console.error(e)); }
}

const origin = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

// ---- summaries ---------------------------------------------------------------

export type ApplicationSummary = ReturnType<typeof summarize>;

/** What to do next, in words an agent can relay or act on. */
function nextStep(app: Application, open: number): string {
  switch (app.status) {
    case "queued": case "fetching": case "tailoring": case "rendering":
      return "Still preparing. Check again in about 30 seconds; the resume usually takes a minute.";
    case "unsupported":
      return "This link is not a Greenhouse, Lever or Ashby job posting, so it cannot be prepared. Ask the user for the posting's direct apply link on one of those boards.";
    case "ready":
      return open
        ? `Resume is ready. ${open} form question${open > 1 ? "s" : ""} still need the user's answer (see questions where needsHuman is true). Ask the user, then call answer_questions.`
        : "Resume is ready and every form question has an answer. To submit: fetch the form answers and the PDF, fill the application form in the browser, submit it, then call mark_submitted. Or call approve_application to have the user's own desktop runner fill it instead.";
    case "approved": return "Approved. The user's desktop runner will fill the form when it is running. Nothing to do here unless you want to fill the form yourself.";
    case "filling": return "The desktop runner is filling the form right now.";
    case "filled": return "The desktop runner filled the form and is waiting for the user to press Submit in the app. Confirm with the user, then the runner submits.";
    case "submit_requested": return "Submit was requested; the runner is pressing Submit.";
    case "code_required": return "The job board emailed the user a verification code. Ask the user for it and enter it in the app (this step is not exposed to connectors).";
    case "submitted": return "Submitted. Nothing more to do.";
    case "failed": return `Preparation failed: ${app.error || "unknown error"}. You can retry with regenerate_resume, or ask the user to check their profile.`;
  }
}

export function summarize(app: Application, opts: { resume?: boolean } = {}) {
  const open = app.questions.filter((q) => q.needsHuman).length;
  return {
    id: app.id,
    url: app.url,
    status: app.status,
    statusLabel: LABEL[app.status],
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    job: app.job ? { board: app.job.board, company: app.job.company, title: app.job.title, location: app.job.location, applyUrl: app.job.applyUrl } : undefined,
    headline: app.headline,
    jdSummary: app.jdSummary,
    fitNotes: app.fitNotes,
    matchScore: app.match ? { tailored: app.match.tailored, profile: app.match.profile, missing: app.match.missing.slice(0, 12) } : undefined,
    resumePdfUrl: app.resumePdfUrl ? signedPdfUrl(origin(), app.userId, app.id) : undefined,
    resumeWarnings: app.resumeWarnings,
    resume: opts.resume ? app.resume : undefined,
    openQuestions: open,
    questions: app.questions.map((q) => ({ id: q.id, label: q.label, type: q.type, required: q.required, options: q.options, answer: q.answer, source: q.source, needsHuman: q.needsHuman })),
    error: app.error,
    submittedAt: app.submittedAt,
    nextStep: nextStep(app, open),
    reviewUrl: `${origin()}/a/${app.id}`
  };
}

async function load(userId: string, id: string): Promise<Application> {
  const app = await getApplication(userId, id);
  if (!app) throw new ApiError(404, `No application ${id} for this account.`);
  return app;
}

// ---- applications -------------------------------------------------------------

export async function createApplication(userId: string, url: string) {
  if (!/^https?:\/\/\S+$/i.test(url.trim())) throw new ApiError(400, "url must be an http(s) link to a job posting.");
  if (!(await getProfile(userId))) throw new ApiError(409, "This account has no profile yet. Import a resume (import_resume) or set a profile (update_profile) first.");
  const id = nanoid(10);
  const now = new Date().toISOString();
  const app: Application = { id, userId, url: url.trim(), createdAt: now, updatedAt: now, status: "queued", questions: [] };
  await saveApplication(app);
  schedule(() => processApplication(userId, id));
  return summarize(app);
}

export async function getApplicationSummary(userId: string, id: string, opts?: { resume?: boolean }) {
  return summarize(await load(userId, id), opts);
}

export async function listApplicationSummaries(userId: string, status?: ApplicationStatus) {
  const apps = await listApplications(userId);
  return apps.filter((a) => !status || a.status === status).map((a) => summarize(a));
}

export async function removeApplication(userId: string, id: string) {
  await load(userId, id);
  await deleteApplication(userId, id);
  return { ok: true, id };
}

/** Answers keyed by question id or, as a convenience, by label (case-insensitive). Empty string clears. */
export async function answerQuestions(userId: string, id: string, answers: Record<string, string>) {
  const app = await load(userId, id);
  const unknown: string[] = [];
  for (const [key, raw] of Object.entries(answers)) {
    const q = app.questions.find((x) => x.id === key) || app.questions.find((x) => x.label.toLowerCase() === key.toLowerCase());
    if (!q) { unknown.push(key); continue; }
    const v = String(raw ?? "").trim();
    q.answer = v || undefined; q.source = v ? "user" : undefined; q.needsHuman = !v && q.required;
  }
  await saveApplication(app);
  return { ...summarize(app), unknownQuestions: unknown.length ? unknown : undefined };
}

export async function approve(userId: string, id: string) {
  const app = await load(userId, id);
  if (app.status !== "ready") throw new ApiError(409, `Cannot approve while it is ${LABEL[app.status].toLowerCase()}.`);
  app.status = "approved"; app.approvedAt = new Date().toISOString();
  await saveApplication(app);
  return summarize(app);
}

export async function regenerate(userId: string, id: string, notes?: string) {
  const app = await load(userId, id);
  if (PROCESSING.includes(app.status)) throw new ApiError(409, `It is ${LABEL[app.status].toLowerCase()} right now; wait for it to finish.`);
  app.revisionNotes = notes?.trim() || undefined;
  app.status = "queued"; app.error = undefined; app.approvedAt = undefined;
  await saveApplication(app);
  schedule(() => processApplication(userId, id));
  return summarize(app);
}

/** The agent (or the user, elsewhere) submitted the form itself. */
export async function markSubmitted(userId: string, id: string, note?: string) {
  const app = await load(userId, id);
  if (["queued", "fetching", "tailoring", "rendering", "unsupported"].includes(app.status)) throw new ApiError(409, `Cannot mark a ${LABEL[app.status].toLowerCase()} application as submitted.`);
  app.status = "submitted"; app.submittedAt = new Date().toISOString(); app.verificationCode = undefined; app.error = undefined;
  app.runnerNotes = [...(app.runnerNotes || []), note?.trim() || "Marked as submitted through the connector API"].slice(-30);
  await saveApplication(app);
  return summarize(app);
}

/**
 * Everything needed to fill the application form without a human: contact fields, every question
 * with its answer, and the PDF link for the resume upload. Refuses while questions are still open
 * unless `allowOpen`, so an agent never submits a half-answered form by accident.
 */
export async function formAnswers(userId: string, id: string, allowOpen = false) {
  const app = await load(userId, id);
  if (!app.resumePdfUrl || !["ready", "approved", "filling", "filled", "submit_requested", "code_required", "failed"].includes(app.status)) throw new ApiError(409, `The resume is not ready yet (${LABEL[app.status].toLowerCase()}).`);
  const settings = withProfileFallback(Settings.parse((await getSettings(userId)) ?? {}), await getProfile(userId));
  refreshAnswers(app, settings);
  const open = app.questions.filter((q) => q.needsHuman);
  if (open.length && !allowOpen) throw new ApiError(409, `${open.length} question(s) still need the user's answer: ${open.map((q) => q.label).join("; ")}. Call answer_questions first, or pass allowOpen to get the partial form.`);
  const contact = stripSecrets(settings);
  return {
    applicationId: app.id,
    applyUrl: app.job?.applyUrl || app.url,
    company: app.job?.company, title: app.job?.title,
    resumePdfUrl: signedPdfUrl(origin(), userId, app.id),
    resumeFileName: `Resume_${app.job?.company || "tailored"}.pdf`,
    contact,
    fields: app.questions.map((q) => ({ id: q.id, label: q.label, type: q.type, required: q.required, options: q.options, value: q.answer ?? (q.type === "file" ? (/resume|\bcv\b|curriculum/i.test(q.label) ? "<attach resumePdfUrl>" : q.required ? "<file required: ask the user>" : "<optional upload: skip>") : ""), needsHuman: q.needsHuman })),
    instructions: [
      "Open applyUrl in the browser. Fill the contact fields from `contact` (firstName, lastName, email, phone, location, linkedin, github, website).",
      "For every entry in `fields`, find the form field by label and enter `value`; for select fields choose the option that matches `value`. Upload the PDF at resumePdfUrl only where the form asks for a resume or CV; leave optional uploads such as a cover letter empty unless the user gives you one.",
      "Do not invent answers. If the form asks something not in `fields`, ask the user before submitting.",
      "After the form is submitted, call mark_submitted with this applicationId. If the board emails the user a verification code, ask the user for it and enter it."
    ]
  };
}

// ---- profile and known answers --------------------------------------------------

export async function readProfile(userId: string) {
  const p = await getProfile(userId);
  if (!p) throw new ApiError(404, "No profile yet. Import a resume (import_resume) or set one (update_profile).");
  return p;
}

export async function writeProfile(userId: string, raw: unknown) {
  const parsed = Profile.safeParse(raw);
  if (!parsed.success) throw new ApiError(400, `Profile does not match the schema: ${z.prettifyError(parsed.error).slice(0, 600)}`);
  await saveProfile(userId, parsed.data);
  await seedAnswers(userId, parsed.data);
  return parsed.data;
}

/** Build or extend the profile from the plain text of a resume (paste the text; PDFs are handled by the web app). */
export async function importResumeText(userId: string, text: string, mode: "merge" | "replace" = "merge") {
  if (text.trim().length < 200) throw new ApiError(400, "Send the full text of the resume (at least 200 characters).");
  const parsed = await textToProfile(text);
  const existing = mode === "merge" ? await getProfile(userId) : null;
  const profile = existing ? mergeProfiles(Profile.parse(existing), parsed) : parsed;
  await saveProfile(userId, profile);
  await seedAnswers(userId, profile);
  return profile;
}

async function seedAnswers(userId: string, profile: Profile) {
  const current = Settings.parse((await getSettings(userId)) ?? {});
  const seeded = withProfileFallback(current, profile);
  await saveSettings(userId, seeded);
  await refreshOpen(userId, seeded);
}

async function refreshOpen(userId: string, settings: Settings) {
  const apps = (await listApplications(userId)).filter(ANSWERS_MATTER);
  await Promise.all(apps.filter((a) => refreshAnswers(a, settings)).map((a) => saveApplication(a)));
}

function stripSecrets(s: Settings): KnownAnswers {
  const out: Record<string, string> = {};
  for (const k of Object.keys(KnownAnswers.shape)) out[k] = s[k as keyof Settings];
  return out as KnownAnswers;
}

/** The Settings schema minus secrets: what the form filler already knows about this user. */
export const KnownAnswers = Settings.omit({ runnerToken: true, apiKey: true });
export type KnownAnswers = z.infer<typeof KnownAnswers>;

export async function readKnownAnswers(userId: string): Promise<KnownAnswers> {
  const s = withProfileFallback(Settings.parse((await getSettings(userId)) ?? {}), await getProfile(userId));
  return stripSecrets(s);
}

export async function updateKnownAnswers(userId: string, patch: Record<string, unknown>) {
  const current = Settings.parse((await getSettings(userId)) ?? {});
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => k in KnownAnswers.shape && k !== "runnerToken" && k !== "apiKey").map(([k, v]) => [k, String(v ?? "").trim()]));
  const parsed = Settings.safeParse({ ...current, ...clean });
  if (!parsed.success) throw new ApiError(400, `Invalid answers: ${z.prettifyError(parsed.error).slice(0, 400)}`);
  await saveSettings(userId, parsed.data);
  await refreshOpen(userId, withProfileFallback(parsed.data, await getProfile(userId)));
  return readKnownAnswers(userId);
}

export const STATUSES: ApplicationStatus[] = ["queued", "fetching", "unsupported", "tailoring", "rendering", "ready", "approved", "filling", "filled", "submit_requested", "code_required", "submitted", "failed"];
