/**
 * One-off clean-up. The fictional sample applicant once carried +91 98765 43210, which is a real
 * person's number, and test profiles built from it ended up in live accounts. Wherever an account
 * still holds it (profile, standing answers, saved answers, form answers on applications), it is
 * replaced with the phone on the account's Answers page, or removed when there is none.
 */
import { getDoc, putDoc } from "./docs";
import { getProfile, getSettings, listApplications, saveApplication, saveProfile, saveSettings } from "./store";
import { getBank, saveBank } from "./apply/bank";
import { Settings } from "./profile/types";
import { renderPdf } from "./resume/render";
import { launchBrowser } from "./browser";
import { saveFile, type Application } from "./store";
import { resumeProfileFor } from "./apply/pipeline";
import type { Profile } from "./profile/types";

const SAMPLE = /\+?\s*91[\s-]*98765[\s-]*43210|\b98765[\s-]*43210\b|\b9876543210\b/g;
const has = (v: unknown) => typeof v === "string" && new RegExp(SAMPLE.source).test(v);
const done = new Set<string>();

export async function scrubSamplePhone(uid: string): Promise<number> {
  if (done.has(uid)) return 0;
  done.add(uid);
  const marker = `users/${uid}/scrubbed-sample-phone.json`;
  if (await getDoc(marker)) return 0;
  const [profile, settings, bank, apps] = await Promise.all([getProfile(uid), getSettings(uid), getBank(uid), listApplications(uid)]);
  // The replacement: the account's own phone, if it is a real one.
  const own = [settings?.phone, profile?.phone].find((p) => p && !has(p)) || "";
  const fix = (v: string) => v.replace(new RegExp(SAMPLE.source, "g"), own).trim();
  let changes = 0;
  let fixedProfile: Profile | null = null;
  if (profile && has(profile.phone)) { fixedProfile = { ...profile, phone: own }; await saveProfile(uid, fixedProfile); changes++; }
  if (settings && has(settings.phone)) { await saveSettings(uid, { ...settings, phone: own }); changes++; }
  let bankChanged = false;
  for (const e of Object.values(bank)) if (has(e.answer)) { e.answer = fix(e.answer); bankChanged = true; changes++; }
  if (bankChanged) await saveBank(uid, bank);
  for (const a of apps) {
    let touched = false;
    for (const q of a.questions) if (has(q.answer)) { q.answer = fix(q.answer || ""); touched = true; }
    if (touched) { await saveApplication(a); changes++; }
  }
  // PDFs already rendered print the old number in their header: render them again from the fixed profile.
  if (fixedProfile) changes += await rerenderOpenResumes(uid, apps, fixedProfile, Settings.parse(settings ?? {}).resumeTemplate);
  await putDoc(marker, { at: new Date().toISOString(), changes });
  if (changes) console.log(`scrubbed the sample phone number from ${changes} place(s) for ${uid}`);
  return changes;
}

/** Re-render both resume versions of every application that has not been submitted yet. */
async function rerenderOpenResumes(uid: string, apps: Application[], profile: Profile, fallbackTemplate: Settings["resumeTemplate"]): Promise<number> {
  const open = apps.filter((a) => a.variants && a.job && !["submitted", "unsupported", "submit_requested"].includes(a.status));
  if (!open.length) return 0;
  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;
  const shared = async () => { browser ??= await launchBrowser(); return new Proxy(browser, { get: (t, k) => (k === "close" ? async () => {} : Reflect.get(t, k as keyof typeof t)) }); };
  let n = 0;
  try {
    for (const a of open) {
      const who = resumeProfileFor(profile, a.job!.title, a.jobDescription || a.job!.descriptionPreview || "");
      const stamp = Date.now().toString(36);
      for (const k of ["tailored", "full"] as const) {
        const v = a.variants![k];
        const r = await renderPdf(v.resume, who, shared, a.template ?? fallbackTemplate);
        v.pdfUrl = await saveFile(`users/${uid}/resumes/${a.id}-${k}-${stamp}.pdf`, r.pdf, "application/pdf");
        v.scale = r.scale; v.trims = r.trims;
      }
      const choice = a.resumeChoice || "tailored";
      a.resumePdfUrl = a.variants![choice].pdfUrl; a.scale = a.variants![choice].scale; a.trims = a.variants![choice].trims;
      await saveApplication(a); n++;
    }
  } finally { await (browser as Awaited<ReturnType<typeof launchBrowser>> | null)?.close().catch(() => {}); }
  return n;
}
