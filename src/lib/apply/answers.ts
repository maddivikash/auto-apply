/**
 * Where an application's form answers come from, kept in one place so the pipeline,
 * the review page, the dashboard counts and the runner all agree.
 *
 * Two rules fix "it asked me things I already filled in":
 * 1. Settings blanks fall back to the profile, so a user who only built a profile
 *    still has a name, email, phone, location and links.
 * 2. Rule-derived answers are re-derived from the current settings whenever an
 *    application is shown or the settings are saved, not only when it was created.
 */
import { answerFor, countryOf, needsHuman } from "../defaults";
import type { Profile, Settings } from "../profile/types";
import type { JobQuestion } from "../jobs/fetch";
import type { Application, QuestionState } from "../store";

const httpsUrl = (u: string) => (u ? `https://${u.replace(/^https?:\/\//, "")}` : "");
const or = (a: string | undefined, b: string | undefined) => (a && a.trim()) || b || "";

/** Years since the earliest role started, as a whole number string. Empty when no year is found. */
export function yearsFrom(starts: string[]): string {
  const years = starts.map((d) => Number((d.match(/(19|20)\d{2}/) || [])[0])).filter(Boolean);
  if (!years.length) return "";
  return String(Math.max(0, new Date().getFullYear() - Math.min(...years)));
}

/** Settings with every blank filled from the profile. Explicit settings always win. */
export function withProfileFallback(s: Settings, p: Profile | null | undefined, accountEmail?: string | null): Settings {
  if (!p) return accountEmail ? { ...s, email: or(s.email, accountEmail), notifyEmail: or(s.notifyEmail, accountEmail) } : s;
  const [first, ...rest] = p.name.trim().split(/\s+/);
  const email = or(s.email, p.email || accountEmail || "");
  return {
    ...s,
    firstName: or(s.firstName, first),
    lastName: or(s.lastName, rest.join(" ")),
    email,
    phone: or(s.phone, p.phone),
    phoneCountry: or(s.phoneCountry, countryOf(p.location) || (s.workAuthorizedCountries || "").split(",")[0].trim()),
    location: or(s.location, p.location),
    gender: or(s.gender, p.gender),
    linkedin: or(s.linkedin, httpsUrl(p.linkedin)),
    github: or(s.github, httpsUrl(p.github)),
    website: or(s.website, httpsUrl(p.website)),
    currentCompany: or(s.currentCompany, p.roles[0]?.company),
    currentTitle: or(s.currentTitle, p.roles[0]?.title),
    workAuthorizedCountries: or(s.workAuthorizedCountries, countryOf(p.location)),
    yearsExperience: or(s.yearsExperience, yearsFrom(p.roles.map((r) => r.start))),
    education: p.education?.length ? p.education : s.education || [],
    notifyEmail: or(s.notifyEmail, accountEmail || email)
  };
}

/** Hidden geo fields Greenhouse fills from the location autocomplete; never a question for a person. */
export const isHiddenGeo = (label: string) => /^(longitude|latitude)$/i.test(label);

/** Fresh question states for a posting's questions, answered from the given settings. */
export function questionStates(questions: JobQuestion[], settings: Settings, jobLocation?: string): QuestionState[] {
  const out = questions.filter((q) => !isHiddenGeo(q.label)).map((q): QuestionState => ({ ...q, needsHuman: false }));
  const app = { questions: out, job: { location: jobLocation } } as unknown as Application;
  refreshAnswers(app, settings);
  return out;
}

/**
 * Re-derive every answer that did not come from the user. Returns true when anything changed,
 * so callers can decide whether to persist.
 */
export function refreshAnswers(app: Application, settings: Settings): boolean {
  let changed = false;
  for (const q of app.questions) {
    if (q.source === "user" && q.answer) continue;
    const a = answerFor(settings, q.label, q.options, q.type, { jobLocation: app.job?.location });
    const human = q.type !== "file" && !a && (needsHuman(q.label, q.type) || q.required);
    if (q.answer !== a?.value || q.source !== a?.source || q.needsHuman !== human) {
      q.answer = a?.value;
      q.source = a?.source;
      q.needsHuman = human;
      changed = true;
    }
  }
  return changed;
}

/** Statuses whose answers still matter. Submitted and unsupported applications are left alone. */
export const ANSWERS_MATTER = (a: Application) => !["submitted", "unsupported"].includes(a.status);
