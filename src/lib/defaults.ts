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
  // Two patterns on purpose: place names are matched regardless of case, a trailing ", CA"-style state code only in capitals.
  // (One case-sensitive pattern used to miss "United States" itself, so US jobs never got their authorization or sponsorship answers.)
  [/\b(united states|usa|u\.s\.a?|us remote|remote,? us|new york|nyc|san francisco|bay area|silicon valley|palo alto|mountain view|menlo park|san jose|sunnyvale|redwood city|oakland|seattle|austin|boston|chicago|los angeles|denver|atlanta|miami|dallas|houston|phoenix|philadelphia|san diego|portland|washington,? d\.?c\.?|salt lake city|minneapolis|raleigh|nashville)\b/i, "United States"],
  [/,\s*[A-Z]{2}(\s*\(|$|\s*\||\s*;)/, "United States"],
  [/\b(united kingdom|uk|london|manchester|edinburgh)\b/i, "United Kingdom"],
  [/\b(ireland|dublin)\b/i, "Ireland"], [/\b(netherlands|amsterdam)\b/i, "Netherlands"], [/\b(germany|berlin|munich)\b/i, "Germany"],
  [/\b(france|paris)\b/i, "France"], [/\b(canada|toronto|vancouver|montreal)\b/i, "Canada"], [/\b(singapore)\b/i, "Singapore"],
  [/\b(australia|sydney|melbourne)\b/i, "Australia"], [/\b(uae|dubai|abu dhabi)\b/i, "United Arab Emirates"], [/\b(japan|tokyo)\b/i, "Japan"],
  [/\b(chile|santiago)\b/i, "Chile"], [/\b(pakistan|karachi|lahore|islamabad)\b/i, "Pakistan"], [/\b(vietnam|viet nam|ho chi minh|hanoi)\b/i, "Vietnam"],
  [/\b(philippines|manila|cebu)\b/i, "Philippines"], [/\b(brazil|brasil|são paulo|sao paulo|rio de janeiro)\b/i, "Brazil"], [/\b(mexico|méxico|mexico city|guadalajara|monterrey)\b/i, "Mexico"],
  [/\b(spain|madrid|barcelona)\b/i, "Spain"], [/\b(italy|milan|rome)\b/i, "Italy"], [/\b(poland|warsaw|krakow|kraków|wrocław|wroclaw)\b/i, "Poland"], [/\b(portugal|lisbon|porto)\b/i, "Portugal"],
  [/\b(sweden|stockholm)\b/i, "Sweden"], [/\b(switzerland|zurich|zürich|geneva)\b/i, "Switzerland"], [/\b(israel|tel aviv)\b/i, "Israel"], [/\b(south africa|cape town|johannesburg)\b/i, "South Africa"],
  [/\b(new zealand|auckland|wellington)\b/i, "New Zealand"], [/\b(indonesia|jakarta)\b/i, "Indonesia"], [/\b(malaysia|kuala lumpur)\b/i, "Malaysia"], [/\b(argentina|buenos aires)\b/i, "Argentina"], [/\b(colombia|bogot[aá])\b/i, "Colombia"]
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
const yesNo = (o: string[] | undefined, yes: boolean) => (o?.length ? pick(o, yes ? /^yes\b/i : /^no\b/i) : yes ? "Yes" : "No");
/** Countries a question names, by the same hints as countryOf: "Canada, UK or Poland" -> Canada, United Kingdom, Poland. */
const countriesIn = (text: string) => { const out = new Set<string>(); for (const part of text.split(/,|\bor\b|\band\b|\//i)) { const c = countryOf(part) ?? (/\bpoland\b/i.test(part) ? "Poland" : undefined); if (c) out.add(c); } return out; };

const RULES: Rule[] = [
  // Screening questions that sound like other rules but are not: answered before the broad rules below see them.
  { test: /employment agreements?|post[- ]employment restrictions?|non[- ]?compete|non[- ]?solicit|restrictive covenants?/i, answer: (_s, o) => yesNo(o, false) },
  { test: /(previously|ever|before) (worked|been employed|consulted|interned)( at| for| with)|former (employee|contractor) (of|at)/i, answer: (_s, o) => yesNo(o, false) },
  // "...sponsorship to remain in your current location": about where the person lives, not where the job is.
  { test: /sponsor[^?]*(current(ly)? (location|country)|where you (currently )?(live|reside|are based))/i, answer: (s, o) => { const home = countryOf(s.location); if (!home) return undefined; const ok = s.workAuthorizedCountries.split(",").some((c) => c.trim().toLowerCase() === home.toLowerCase()); return yesNo(o, !ok); } },
  // "Are you currently located in the New York area?" / "Do you live in the Bay Area?": compare the named area with where the person lives.
  { test: /(located|based|live|living|reside|residing) (in|near|within) (the )?(greater )?[A-Z][\w.' -]*?\s?(area|region|metro(politan)?( area)?|bay area)\b/i, answer: (s, o, _c, label) => { const m = (label || "").match(/(located|based|live|living|reside|residing) (?:in|near|within) (?:the )?(?:greater )?([A-Z][\w.' -]*?)\s?(?:area|region|metro)/i); const area = m?.[2]?.trim(); if (!area || !s.location) return undefined; const words = area.split(/\s+/).filter((w) => w.length > 2 && !/^(the|and|or)$/i.test(w)); const here = words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(s.location)); return here ? yesNo(o, true) : undefined; } },
  // Not in that area is left to the person: "No" often auto-rejects, and they may be about to move there.
  // "Are you currently located in either Canada, UK or Poland?"
  { test: /(currently |presently )?(locat(ed|ion)|living|based|residing|reside) in (either )?[A-Z][^?]*\b(or|and)\b/i, answer: (s, o, _c, label) => { const home = countryOf(s.location); if (!home || !label) return undefined; const listed = countriesIn(label.replace(/^.*?\b(?:in|either)\b/i, "")); return listed.size ? yesNo(o, listed.has(home)) : undefined; } },
  { test: /^first\s*name/i, answer: (s) => or(s.firstName) },
  { test: /^last\s*name|surname|family name/i, answer: (s) => or(s.lastName) },
  { test: /^(full |legal )?name$/i, answer: (s) => or(`${s.firstName} ${s.lastName}`.trim()) },
  { test: /preferred (first )?name/i, answer: (s) => or(s.firstName) },
  { test: /e-?mail/i, answer: (s) => or(s.email) },
  { test: /phone|mobile/i, answer: (s) => or(s.phone) },
  { test: /include your linkedin.*(website|blog)|linkedin.*personal website|website or blog/i, answer: (s) => or(links(s)) },
  { test: /linkedin/i, answer: (s) => or(s.linkedin) },
  // The profile link, not "experience with GitHub Actions": only short, link-shaped labels.
  { test: /^(your )?github( (url|link|profile|username|account|handle))?$|github (url|link|profile)/i, answer: (s) => or(s.github) },
  { test: /portfolio|personal (web)?site|^website$/i, answer: (s) => or(s.website) },
  { test: /(authori[sz]ed|eligible|right) to work|work authori[sz]ation|work permit/i, answer: (s, o, ctx) => { const a = authorizedAnswer(s, ctx?.jobLocation); if (!a) return undefined; return o?.length ? pick(o, a === "Yes" ? /^yes\b/i : /^no\b/i) : a; } },
  { test: /sponsor(ship)?|visa|immigration/i, answer: (s, o, ctx) => { const a = sponsorshipAnswer(s, ctx?.jobLocation); if (!a) return undefined; return o?.length ? pick(o, a === "No" ? /^no\b/i : /^yes\b/i) : a; } },
  { test: /relocat/i, answer: (s, o) => o?.length ? pick(o, s.willingToRelocate === "Yes" ? /willing to relocate/i : /not willing|do not/i, s.willingToRelocate === "Yes" ? /^yes\b/i : /^no\b/i) : s.willingToRelocate },
  { test: /open to (working )?(in[- ]?person|hybrid|in one of our offices)|onsite|on-site/i, answer: (s, o) => pick(o, s.openToOnsite === "Yes" ? /^yes\b/i : /^no\b/i) },
  { test: /remote/i, answer: (_s, o) => pick(o, /^yes\b/i, /open|either|flexible/i) },
  { test: /office of choice|which office|preferred (office|location)|office location|work location preference/i, answer: (s, o, ctx) => { if (!o?.length) return undefined; const cities = [s.location, ctx?.jobLocation].filter(Boolean).flatMap((v) => v!.split(/[,/]/)).map((c) => c.trim()).filter((c) => c.length > 2); for (const c of cities) { const hit = o.find((x) => new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(x) || (/^bengaluru$/i.test(c) && /bangalore/i.test(x)) || (/^bangalore$/i.test(c) && /bengaluru/i.test(x))); if (hit) return hit; } return undefined; } },
  { test: /^(what('s| is) )?(your )?(current |present )?location( \([^)]*\))?$|^(current )?city( \([^)]*\))?$|city of residence|(which|what) city (are you|do you) (currently )?(based|located|live|reside|in)|city (you|do you) (currently )?(live|are based|reside) in|where (are you|do you) (currently )?(based|live|reside|located)|current(ly)? (city|located|residing)|(your|preferred|present) location\b|location in (india|the )/i, answer: (s) => or(s.location) },
  { test: /flexible (to |with )?(work|working|relocat)|willing to work (from|in|at)|open to (working|relocating) (from|in|to)|comfortable (working|commuting) (from|to|in)/i, answer: (s, o) => o?.length ? pick(o, s.willingToRelocate === "Yes" ? /^yes\b/i : /^no\b/i) : s.willingToRelocate },
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
  { test: /notice period|earliest.*start|start date|availability|when (can|could|would) you (start|join)/i, answer: (s, o) => {
    if (!o?.length) return or(s.noticePeriod);
    // Choice lists bucket the notice: "Immediate Joiner", "30-45 days", "Less than 30 days", "90+ days". Find the bucket holding ours.
    const n = /immediate|right away|now/i.test(s.noticePeriod) ? 0 : parseInt(s.noticePeriod, 10);
    if (isNaN(n)) return undefined;
    return o.find((x) => {
      const range = /(\d+)\s*(?:-|–|to)\s*(\d+)/.exec(x); if (range) return n >= +range[1] && n <= +range[2];
      const num = /(\d+)/.exec(x)?.[1]; if (!num) return n === 0 && /immediate/i.test(x);
      if (/\+|more than|over|above|greater/i.test(x)) return n >= +num;
      if (/less than|under|within|up to|below|at most/i.test(x)) return n <= +num;
      return n === +num;
    });
  } },
  { test: /18 years|legal age|at least 18/i, answer: (_s, o) => pick(o, /^yes\b/i) },
  { test: /\b\d+\s*\+?\s*(or more\s*)?(years?|yrs)\b(?! of age)/i, answer: (s, o, _c, label) => { const n = Number((label || "").match(/(\d+)\s*\+?\s*(or more\s*)?(years?|yrs)/i)?.[1]); const mine = parseFloat(s.yearsExperience); if (!o?.length || !n || isNaN(mine)) return undefined; return pick(o, mine >= n ? /^yes\b/i : /^no\b/i); } },
  { test: /how many years\b.*\bexperience/i, answer: (s, o) => o?.length ? undefined : or(s.yearsExperience) },
  { test: /years? of (professional |relevant |work |industry )?experience/i, answer: (s, o) => o?.length ? (s.yearsExperience ? pick(o, new RegExp(`^${s.yearsExperience}\\b`)) : undefined) : or(s.yearsExperience) },
  { test: /(current|most recent|latest|present)[^.?]{0,25}(employer|company|organi[sz]ation)\b/i, answer: (s) => or(s.currentCompany) },
  { test: /(current|most recent|latest|present)[^.?]{0,25}(job )?(title|role|position|designation)\b/i, answer: (s) => or(s.currentTitle) },
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
  // Forms decorate labels: "Current location *", "Current location?", stray spaces. Match on the words.
  const words = label.replace(/\s+/g, " ").replace(/[\s*:?.]+$/, "").trim();
  for (const r of RULES) {
    if (r.test.test(words)) {
      const v = r.answer(settings, options, ctx, words);
      if (!v) return undefined;
      // A rule's free-text answer is no use for a choice field: "Are you currently located in the New York
      // area?" (Yes/No) must not become "Bengaluru, India". Leave it for the person instead.
      if (options?.length) {
        const want = v.trim().toLowerCase();
        // "30 days" may be offered as "I can start within 30 days": take the one option that contains the answer.
        const exact = options.find((o) => o.trim().toLowerCase() === want);
        const containing = options.filter((o) => o.toLowerCase().includes(want));
        const chosen = exact ?? (containing.length === 1 ? containing[0] : undefined);
        return chosen ? { value: chosen, source: "rule" } : undefined;
      }
      return { value: v, source: "rule" };
    }
  }
  return undefined;
}

/** Free-text questions that need a human: cover letter, why us, deadlines, anything essay-like. */
export function needsHuman(label: string, type?: string): boolean {
  if (type === "textarea") return true;
  return /why (do you want|are you interested|us|this role|company)|cover letter|deadline|timeline|tell us|describe|explain|anything else|additional information|personal preferences|address/i.test(label);
}
