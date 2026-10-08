/**
 * One-off clean-up of phone numbers that must not be on file. The fictional sample applicant once
 * carried a real person's number, and test accounts ended up holding a real owner's number next to a
 * made-up identity. Wherever an account still holds one (profile, standing answers, saved answers,
 * form answers on applications, rendered resume PDFs), it is replaced with the account's own phone,
 * or with a fictional one when the account's phone is itself being removed.
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

const FICTIONAL = "+1 555 010 0199";
/** A phone number in any common formatting: "+91 98765 43210", "+919876543210", "98765-43210". */
const pattern = (digits: string) => `(?:\\+?\\s*91[\\s-]*)?${digits.slice(0, 5)}[\\s-]*${digits.slice(5)}`;
// The old sample number, plus numbers listed privately in SCRUB_PHONES (never in source: this repository is public).
const listed = (process.env.SCRUB_PHONES || "").split(",").map((d) => d.replace(/\D/g, "").slice(-10)).filter((d) => d.length === 10);
const TARGETS = ["9876543210", ...listed];
const MATCH = new RegExp(TARGETS.map(pattern).join("|"), "g");
const has = (v: unknown) => typeof v === "string" && new RegExp(MATCH.source).test(v);
// Email swaps for test accounts, also private: REPLACE_EMAILS="old@example.com=new@maildrop.cc,...".
const EMAIL_SWAPS = (process.env.REPLACE_EMAILS || "").split(",").map((p) => p.split("=").map((x) => x.trim().toLowerCase())).filter((p): p is [string, string] => p.length === 2 && p.every((x) => x.includes("@")));
const swapEmail = (v: string | undefined) => { const hit = EMAIL_SWAPS.find(([from]) => (v || "").trim().toLowerCase() === from); return hit ? hit[1] : undefined; };
const VERSION = TARGETS.length + EMAIL_SWAPS.length; // a new number or email swap makes the clean-up run again
const done = new Set<string>();

export async function scrubSamplePhone(uid: string): Promise<number> {
  if (done.has(uid)) return 0;
  done.add(uid);
  const marker = `users/${uid}/scrubbed-sample-phone.json`;
  const prev = await getDoc<{ version?: number }>(marker);
  if (prev && (prev.version ?? 1) >= VERSION) return 0;
  const [profile, settings, bank, apps] = await Promise.all([getProfile(uid), getSettings(uid), getBank(uid), listApplications(uid)]);
  // The replacement: the account's own phone if it is not one of the numbers being removed, else a fictional one.
  const own = [settings?.phone, profile?.phone].find((p) => p && !has(p)) || FICTIONAL;
  const fix = (v: string) => v.replace(new RegExp(MATCH.source, "g"), own).trim();
  let changes = 0;
  let fixedProfile: Profile | null = null;
  const profileEmail = swapEmail(profile?.email);
  if (profile && (has(profile.phone) || profileEmail)) { fixedProfile = { ...profile, phone: has(profile.phone) ? own : profile.phone, email: profileEmail ?? profile.email }; await saveProfile(uid, fixedProfile); changes++; }
  const settingsEmail = swapEmail(settings?.email);
  if (settings && (has(settings.phone) || settingsEmail)) { await saveSettings(uid, { ...settings, phone: has(settings.phone) ? own : settings.phone, email: settingsEmail ?? settings.email }); changes++; }
  let bankChanged = false;
  for (const e of Object.values(bank)) if (has(e.answer)) { e.answer = fix(e.answer); bankChanged = true; changes++; }
  if (bankChanged) await saveBank(uid, bank);
  for (const a of apps) {
    let touched = false;
    for (const q of a.questions) {
      if (has(q.answer)) { q.answer = fix(q.answer || ""); touched = true; }
      const e = swapEmail(q.answer); if (e) { q.answer = e; touched = true; }
    }
    if (touched) { await saveApplication(a); changes++; }
  }
  // PDFs already rendered print the old number in their header: render them again from the fixed profile.
  if (fixedProfile) changes += await rerenderOpenResumes(uid, apps, fixedProfile, Settings.parse(settings ?? {}).resumeTemplate);
  await putDoc(marker, { at: new Date().toISOString(), changes, version: VERSION });
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
