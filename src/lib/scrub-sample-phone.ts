/**
 * One-off clean-up. The fictional sample applicant once carried +91 98765 43210, which is a real
 * person's number, and test profiles built from it ended up in live accounts. Wherever an account
 * still holds it (profile, standing answers, saved answers, form answers on applications), it is
 * replaced with the phone on the account's Answers page, or removed when there is none.
 */
import { getDoc, putDoc } from "./docs";
import { getProfile, getSettings, listApplications, saveApplication, saveProfile, saveSettings } from "./store";
import { getBank, saveBank } from "./apply/bank";

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
  if (profile && has(profile.phone)) { await saveProfile(uid, { ...profile, phone: own }); changes++; }
  if (settings && has(settings.phone)) { await saveSettings(uid, { ...settings, phone: own }); changes++; }
  let bankChanged = false;
  for (const e of Object.values(bank)) if (has(e.answer)) { e.answer = fix(e.answer); bankChanged = true; changes++; }
  if (bankChanged) await saveBank(uid, bank);
  for (const a of apps) {
    let touched = false;
    for (const q of a.questions) if (has(q.answer)) { q.answer = fix(q.answer || ""); touched = true; }
    if (touched) { await saveApplication(a); changes++; }
  }
  await putDoc(marker, { at: new Date().toISOString(), changes });
  if (changes) console.log(`scrubbed the sample phone number from ${changes} place(s) for ${uid}`);
  return changes;
}
