/**
 * Answers the app already knows for a user, derived from their Settings.
 * Anything a form asks that is not covered becomes an open question in the email.
 */
import type { Settings } from "./profile/types";
import { parsedEducation, highestEducation, degreeOptionPatterns, type ParsedEducation } from "./apply/education";

export type Answer = { value: string; source: "profile" | "rule" };
export type AnswerContext = { jobLocation?: string };
const edu = (s: Settings): ParsedEducation[] => parsedEducation(s.education);
const latest = (s: Settings) => edu(s)[0];
/** Pick the option that names the candidate's degree level, or the closest "no degree/other" option. */
function degreeOption(level: ParsedEducation["level"] | undefined, o?: string[]): string | undefined {
  if (!o?.length) return undefined;
  for (const re of degreeOptionPatterns(level || "other")) { const hit = o.find((x) => re.test(x)); if (hit) return hit; }
  return o.find((x) => /other/i.test(x));
}
type Rule = { test: RegExp; answer: (s: Settings, opts?: string[], ctx?: AnswerContext, label?: string) => string | undefined };

const COUNTRY_HINTS: [RegExp, string][] = [
  [/\b(india|bengaluru|bangalore|hyderabad|gurugram|gurgaon|mumbai|pune|chennai|delhi|noida|kolkata)\b/i, "India"],
  [/\b(united states|usa|u\.s\.|new york|san francisco|seattle|austin|boston|chicago|los angeles|denver|atlanta)\b|,\s*[A-Z]{2}(\s*\(|$|\s*\||\s*;)/, "United States"],
  [/\b(united kingdom|uk|london|manchester|edinburgh)\b/i, "United Kingdom"],
  [/\b(ireland|dublin)\b/i, "Ireland"], [/\b(netherlands|amsterdam)\b/i, "Netherlands"], [/\b(germany|berlin|munich)\b/i, "Germany"],
  [/\b(france|paris)\b/i, "France"], [/\b(canada|toronto|vancouver|montreal)\b/i, "Canada"], [/\b(singapore)\b/i, "Singapore"],
  [/\b(australia|sydney|melbourne)\b/i, "Australia"], [/\b(uae|dubai|abu dhabi)\b/i, "United Arab Emirates"], [/\b(japan|tokyo)\b/i, "Japan"]
];
export function countryOf(location?: string): string | undefined {
  if (!location) return undefined;
  for (const [re, c] of COUNTRY_HINTS) if (re.test(location)) return c;
  return undefined;
}
/** "No" when the job is in a country the user can already work in, the user's abroad default otherwise, undefined when unknown. */
export function sponsorshipAnswer(s: Settings, jobLocation?: string): "Yes" | "No" | undefined {
  const authorized = s.workAuthorizedCountries.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
  const country = countryOf(jobLocation);
  if (!authorized.length || !country) return undefined;
  return authorized.includes(country.toLowerCase()) ? "No" : s.sponsorshipElsewhere;
}
/** "Yes" when the job is in a country the user can already work in, "No" when it is not, undefined when unknown. */
export function authorizedAnswer(s: Settings, jobLocation?: string): "Yes" | "No" | undefined {
  const authorized = s.workAuthorizedCountries.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
  const country = countryOf(jobLocation);
  if (!authorized.length || !country) return undefined;
  return authorized.includes(country.toLowerCase()) ? "Yes" : "No";
}

const pick = (opts: string[] | undefined, ...prefer: RegExp[]) => {
  if (!opts?.length) return undefined;
  for (const re of prefer) { const hit = opts.find((o) => re.test(o)); if (hit) return hit; }
  return undefined;
};
const or = (v: string | undefined, fallback?: string) => (v && v.trim()) || fallback;
const links = (s: Settings) => [s.website, s.linkedin, s.github].filter(Boolean).join(" | ");

/** Ordered: first matching rule wins. Each rule may decline by returning undefined. */
const RULES: Rule[] = [
  { test: /^first\s*name/i, answer: (s) => or(s.firstName) },
  { test: /^last\s*name|surname|family name/i, answer: (s) => or(s.lastName) },
  { test: /^(full |legal )?name$/i, answer: (s) => or(`${s.firstName} ${s.lastName}`.trim()) },
  { test: /preferred (first )?name/i, answer: (s) => or(s.firstName) },
  { test: /e-?mail/i, answer: (s) => or(s.email) },
  { test: /phone|mobile/i, answer: (s) => or(s.phone) },
  { test: /include your linkedin.*(website|blog)|linkedin.*personal website|website or blog/i, answer: (s) => or(links(s)) },
  { test: /linkedin/i, answer: (s) => or(s.linkedin) },
  { test: /github/i, answer: (s) => or(s.github) },
  { test: /portfolio|personal (web)?site|^website$/i, answer: (s) => or(s.website) },
  { test: /(authori[sz]ed|eligible|right) to work|work authori[sz]ation|work permit/i, answer: (s, o, ctx) => { const a = authorizedAnswer(s, ctx?.jobLocation); if (!a) return undefined; return o?.length ? pick(o, a === "Yes" ? /^yes\b/i : /^no\b/i) : a; } },
  { test: /sponsor(ship)?|visa|immigration/i, answer: (s, o, ctx) => { const a = sponsorshipAnswer(s, ctx?.jobLocation); if (!a) return undefined; return o?.length ? pick(o, a === "No" ? /^no\b/i : /^yes\b/i) : a; } },
  { test: /relocat/i, answer: (s, o) => o?.length ? pick(o, s.willingToRelocate === "Yes" ? /willing to relocate/i : /not willing|do not/i, s.willingToRelocate === "Yes" ? /^yes\b/i : /^no\b/i) : s.willingToRelocate },
  { test: /open to (working )?(in[- ]?person|hybrid|in one of our offices)|onsite|on-site/i, answer: (s, o) => pick(o, s.openToOnsite === "Yes" ? /^yes\b/i : /^no\b/i) },
  { test: /remote/i, answer: (_s, o) => pick(o, /^yes\b/i, /open|either|flexible/i) },
  { test: /^(current )?location( \(city\))?$|^city$|where (are you|do you) (currently )?(based|live|reside)|current(ly)? (city|located|residing)/i, answer: (s) => or(s.location) },
  { test: /country of residence|(country|where) (are|do) you (currently )?(based|reside|live|located)/i, answer: (s) => countryOf(s.location) },
  { test: /(how|where) did you (hear|find|learn)|referral source|^source$/i, answer: (s, o) => o?.length ? pick(o, new RegExp(s.heardFrom || "linkedin", "i")) : or(s.heardFrom, "LinkedIn") },
  { test: /privacy (policy|notice)|acknowledge|consent|agree to|gdpr|i understand|i have read|i confirm/i, answer: (_s, o, _c, label) => (/contact me|marketing|newsletter|alerts|stay up to date|future (job )?opportunit/i.test(label || "") ? undefined : o?.[0]) },
  { test: /interviewed (at|with|for).*(before|last|previously)|previously (applied|interviewed|worked|been employed)|(worked|employed) (at|for|by|with) .*(before|in the past|previously|in any capacity)|former employee|previous .* employment/i, answer: (_s, o) => pick(o, /^no\b/i) },
  // Education, from the profile. GPA only when the form asks for the level the candidate actually has.
  { test: /\bgpa\b|grade point|cgpa|promedio/i, answer: (s, o, _c, label) => { const l = label || ""; const hs = highestEducation(edu(s)); if (/graduate|master|doctor|phd/i.test(l) && !/undergrad/i.test(l) && hs && !["master", "mba", "phd", "md", "jd"].includes(hs.level)) return undefined; const g = latest(s)?.gpa || edu(s).find((e) => e.gpa)?.gpa; if (!g) return undefined; return o?.length ? pick(o, new RegExp(`^${g.split("/")[0].replace(/\./g, "\\.")}`)) : g; } },
  { test: /highest (level of )?(education|degree)|most advanced degree|level of education|education level|degree (completed|attained|earned)/i, answer: (s, o) => { const hs = highestEducation(edu(s)); if (!hs) return undefined; return o?.length ? degreeOption(hs.level, o) : hs.degreeText; } },
  { test: /^(school|university|college|institution)\b|search schools|most recently attended school|last (university|school|college) attended|alma mater|where did you (study|graduate)/i, answer: (s, o) => { const l = latest(s); if (!l?.school) return undefined; return o?.length ? pick(o, new RegExp(l.school.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), /not listed|other/i) : l.school; } },
  { test: /^degree\b|type of degree|degree type/i, answer: (s, o) => { const l = latest(s); if (!l) return undefined; return o?.length ? degreeOption(l.level, o) : l.degreeText; } },
  { test: /discipline|field of study|^major\b|area of study|specializ/i, answer: (s) => or(latest(s)?.discipline) },
  { test: /graduation (year|date)|year of graduation|(expected )?graduat/i, answer: (s, o) => { const l = latest(s); if (!l?.endYear) return undefined; return o?.length ? pick(o, new RegExp(`\\b${l.endYear}\\b`)) : l.endYear; } },
  { test: /notice period|earliest.*start|start date|availability|when (can|could|would) you (start|join)/i, answer: (s) => or(s.noticePeriod) },
  { test: /18 years|legal age|at least 18/i, answer: (_s, o) => pick(o, /^yes\b/i) },
  { test: /\b\d+\s*\+?\s*(or more\s*)?(years?|yrs)\b(?! of age)/i, answer: (s, o, _c, label) => { const n = Number((label || "").match(/(\d+)\s*\+?\s*(or more\s*)?(years?|yrs)/i)?.[1]); const mine = parseFloat(s.yearsExperience); if (!o?.length || !n || isNaN(mine)) return undefined; return pick(o, mine >= n ? /^yes\b/i : /^no\b/i); } },
  { test: /years? of (professional |relevant |work |industry )?experience/i, answer: (s, o) => o?.length ? (s.yearsExperience ? pick(o, new RegExp(`^${s.yearsExperience}\\b`)) : undefined) : or(s.yearsExperience) },
  { test: /current (employer|company)/i, answer: (s) => or(s.currentCompany) },
  { test: /current (title|role|position)/i, answer: (s) => or(s.currentTitle) },
  { test: /salary|compensation expect/i, answer: (s) => or(s.salaryExpectation) },
  { test: /gender/i, answer: (s, o) => {
    const decline = /decline|prefer not|do not wish|don't wish|self.?describe/i;
    if (!s.gender || decline.test(s.gender)) return pick(o, decline) ?? or(s.gender);
    const mine = new RegExp(`^${s.gender.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return o?.length ? pick(o, mine, decline) : s.gender;
  } },
  { test: /race|ethnicity|veteran|disability|hispanic|pronoun/i, answer: (_s, o) => pick(o, /decline|prefer not|do not wish|don't wish/i) }
];

export function answerFor(settings: Settings, label: string, options?: string[], type?: string, ctx?: AnswerContext): Answer | undefined {
  if (type === "file") return undefined;
  for (const r of RULES) {
    if (r.test.test(label)) {
      const v = r.answer(settings, options, ctx, label);
      return v ? { value: v, source: "rule" } : undefined;
    }
  }
  return undefined;
}

/** Free-text questions that need a human: cover letter, why us, deadlines, anything essay-like. */
export function needsHuman(label: string, type?: string): boolean {
  if (type === "textarea") return true;
  return /why (do you want|are you interested|us|this role|company)|cover letter|deadline|timeline|tell us|describe|explain|anything else|additional information|personal preferences|address/i.test(label);
}
