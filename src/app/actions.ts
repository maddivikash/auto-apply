"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { nanoid } from "nanoid";
import { randomBytes } from "node:crypto";
import { requireUserId, userEmail } from "@/lib/auth";
import { getApplication, saveApplication, deleteApplication, saveProfile, getSettings, saveSettings, saveRunnerToken, deleteRunnerToken, markNotificationsRead, type Application } from "@/lib/store";
import { Profile, Settings } from "@/lib/profile/types";
import { processApplication } from "@/lib/apply/pipeline";
import { pdfToText, textToProfile } from "@/lib/profile/import";
import { countryOf } from "@/lib/defaults";

export async function createApplicationAction(formData: FormData) {
  const userId = await requireUserId();
  const url = String(formData.get("url") || "").trim();
  if (!/^https?:\/\//.test(url)) redirect("/dashboard?error=url");
  const id = nanoid(10);
  const now = new Date().toISOString();
  const app: Application = { id, userId, url, createdAt: now, updatedAt: now, status: "queued", questions: [] };
  await saveApplication(app);
  after(() => processApplication(userId, id));
  redirect(`/a/${id}`);
}

export async function reprocessAction(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id"));
  const app = await getApplication(userId, id);
  if (!app) redirect("/dashboard");
  app.status = "queued"; app.error = undefined; await saveApplication(app);
  after(() => processApplication(userId, id));
  redirect(`/a/${id}`);
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
  redirect(`/a/${id}?saved=1`);
}

export async function approveAction(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id"));
  const app = await getApplication(userId, id);
  if (!app || app.status !== "ready") redirect(`/a/${id}`);
  app.status = "approved"; app.approvedAt = new Date().toISOString();
  await saveApplication(app);
  redirect(`/a/${id}`);
}

/** The only path to a real submission. Requires the runner to have filled the form first. */
export async function requestSubmitAction(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id"));
  const app = await getApplication(userId, id);
  if (!app || app.status !== "filled") redirect(`/a/${id}`);
  app.status = "submit_requested"; await saveApplication(app);
  redirect(`/a/${id}`);
}

export async function deleteAction(formData: FormData) {
  const userId = await requireUserId();
  await deleteApplication(userId, String(formData.get("id")));
  redirect("/dashboard");
}

// ---- profile ---------------------------------------------------------------

export async function importResumeAction(formData: FormData) {
  const userId = await requireUserId();
  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) redirect("/profile?error=file");
  let profile;
  try {
    const text = file.type === "application/pdf" || file.name.endsWith(".pdf") ? await pdfToText(new Uint8Array(await file.arrayBuffer())) : await file.text();
    if (text.length < 200) redirect("/profile?error=empty");
    profile = await textToProfile(text);
  } catch (e) {
    if ((e as Error)?.message === "NEXT_REDIRECT" || String((e as any)?.digest || "").startsWith("NEXT_REDIRECT")) throw e;
    redirect(`/profile?error=${encodeURIComponent(`Could not read that resume: ${(e as Error).message.slice(0, 160)}. Try again or use a text-based PDF.`)}`);
  }
  const email = await userEmail();
  if (!profile.email && email) profile.email = email;
  await saveProfile(userId, profile);
  // Seed the answers page from the profile so the user only fills gaps.
  const current = Settings.parse((await getSettings(userId)) ?? {});
  const [first, ...rest] = profile.name.split(" ");
  await saveSettings(userId, { ...current, firstName: current.firstName || first, lastName: current.lastName || rest.join(" "), email: current.email || profile.email || email || "", phone: current.phone || profile.phone, location: current.location || profile.location, linkedin: current.linkedin || (profile.linkedin ? `https://${profile.linkedin.replace(/^https?:\/\//, "")}` : ""), github: current.github || (profile.github ? `https://${profile.github.replace(/^https?:\/\//, "")}` : ""), website: current.website || (profile.website ? `https://${profile.website.replace(/^https?:\/\//, "")}` : ""), currentCompany: current.currentCompany || profile.roles[0]?.company || "", currentTitle: current.currentTitle || profile.roles[0]?.title || "", workAuthorizedCountries: current.workAuthorizedCountries || countryOf(profile.location) || "", yearsExperience: current.yearsExperience || yearsFrom(profile.roles.map((r) => r.start)), notifyEmail: current.notifyEmail || email || "" });
  redirect("/profile?imported=1");
}

/** Years since the earliest role started, as a whole number string. Empty when no year is found. */
function yearsFrom(starts: string[]): string {
  const years = starts.map((d) => Number((d.match(/(19|20)\d{2}/) || [])[0])).filter(Boolean);
  if (!years.length) return "";
  return String(Math.max(0, new Date().getFullYear() - Math.min(...years)));
}

export async function saveProfileAction(formData: FormData) {
  const userId = await requireUserId();
  const raw = String(formData.get("profile") || "");
  let parsed;
  try { parsed = Profile.parse(JSON.parse(raw)); } catch (e) { redirect(`/profile?error=${encodeURIComponent((e as Error).message.slice(0, 200))}`); }
  await saveProfile(userId, parsed);
  redirect("/profile?saved=1");
}

export async function saveSettingsAction(formData: FormData) {
  const userId = await requireUserId();
  const current = Settings.parse((await getSettings(userId)) ?? {});
  const next: Record<string, string> = {};
  for (const key of Object.keys(Settings.shape)) { const v = formData.get(key); if (typeof v === "string") next[key] = v.trim(); }
  await saveSettings(userId, Settings.parse({ ...current, ...next }));
  redirect("/answers?saved=1");
}

export async function rotateRunnerTokenAction() {
  const userId = await requireUserId();
  const current = Settings.parse((await getSettings(userId)) ?? {});
  if (current.runnerToken) await deleteRunnerToken(current.runnerToken);
  const token = randomBytes(24).toString("base64url");
  await saveRunnerToken(token, userId);
  await saveSettings(userId, { ...current, runnerToken: token });
  redirect("/runner");
}

export async function markAllReadAction() {
  const userId = await requireUserId();
  await markNotificationsRead(userId);
  redirect("/notifications");
}
