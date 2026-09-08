/**
 * Answers the app already knows. Anything a form asks that is not covered here
 * goes into the email as an open question for Vikash to answer.
 */
import { MASTER } from "./profile/master";

export type Answer = { value: string; source: "profile" | "rule" };

export const KNOWN = {
  firstName: "Vikash",
  lastName: "Maddi",
  fullName: MASTER.name,
  email: MASTER.email,
  phone: "+91 8374501729",
  phoneNational: "8374501729",
  phoneCountry: "India",
  location: "Gurugram, Haryana, India",
  linkedin: `https://www.${MASTER.linkedin}`,
  github: `https://${MASTER.github}`,
  website: `https://${MASTER.website}`,
  heardFrom: "LinkedIn",
  sponsorship: "No",
  relocate: "Yes",
  authorizedIndia: "Yes",
  noticePeriod: "60 days, negotiable",
  currentCompany: "VMock",
  currentTitle: "Full Stack Developer",
  yearsExperience: "4"
};

type Rule = { test: RegExp; answer: (opts?: string[]) => string | undefined };

const pick = (opts: string[] | undefined, ...prefer: RegExp[]) => {
  if (!opts?.length) return undefined;
  for (const re of prefer) { const hit = opts.find((o) => re.test(o)); if (hit) return hit; }
  return undefined;
};

/** Ordered: first matching rule wins. Each rule may decline by returning undefined. */
const RULES: Rule[] = [
  { test: /^first\s*name/i, answer: () => KNOWN.firstName },
  { test: /^last\s*name|surname|family name/i, answer: () => KNOWN.lastName },
  { test: /^(full |legal )?name$/i, answer: () => KNOWN.fullName },
  { test: /preferred name/i, answer: () => KNOWN.firstName },
  { test: /e-?mail/i, answer: () => KNOWN.email },
  { test: /phone|mobile/i, answer: () => KNOWN.phone },
  { test: /linkedin/i, answer: () => KNOWN.linkedin },
  { test: /github/i, answer: () => KNOWN.github },
  { test: /portfolio|personal (web)?site|^website$/i, answer: () => KNOWN.website },
  { test: /include your linkedin.*website|website or blog/i, answer: () => `${KNOWN.linkedin} | ${KNOWN.website} | ${KNOWN.github}` },
  { test: /(current )?location|where (are you|do you) (currently )?(based|live|reside)|city/i, answer: () => KNOWN.location },
  { test: /how did you (hear|find|learn)|referral source|source/i, answer: (o) => pick(o, /linkedin/i) ?? (o?.length ? undefined : KNOWN.heardFrom) },
  { test: /sponsor(ship)?|visa|work (permit|authori[sz]ation)|immigration/i, answer: (o) => pick(o, /^no\b/i, /not require|do not/i) ?? (o?.length ? undefined : KNOWN.sponsorship) },
  { test: /relocat/i, answer: (o) => pick(o, /willing to relocate/i, /^yes\b/i) ?? (o?.length ? undefined : KNOWN.relocate) },
  { test: /open to (working )?(in[- ]?person|hybrid|in one of our offices)|onsite|on-site/i, answer: (o) => pick(o, /^yes\b/i) },
  { test: /remote/i, answer: (o) => pick(o, /^yes\b/i, /open|either|flexible/i) },
  { test: /privacy (policy|notice)|acknowledge|consent|agree to (the )?(terms|processing)|gdpr/i, answer: (o) => o?.[0] },
  { test: /interviewed (at|with|for).*(before|last|previously)|previously (applied|interviewed)|worked (at|for) .* before|former employee/i, answer: (o) => pick(o, /^no\b/i) },
  { test: /notice period|earliest.*start|start date|availability|when (can|could|would) you (start|join)/i, answer: () => KNOWN.noticePeriod },
  { test: /years? of (professional |relevant |work )?experience/i, answer: (o) => pick(o, /^4\b|3-5|4-6|3\s*(-|to)\s*5/) ?? (o?.length ? undefined : KNOWN.yearsExperience) },
  { test: /current (employer|company)/i, answer: () => KNOWN.currentCompany },
  { test: /current (title|role|position)/i, answer: () => KNOWN.currentTitle },
  { test: /18 years|legal age|at least 18/i, answer: (o) => pick(o, /^yes\b/i) },
  { test: /gender|race|ethnicity|veteran|disability|hispanic|pronoun/i, answer: (o) => pick(o, /decline|prefer not|do not wish|don't wish/i) }
];

export function answerFor(label: string, options?: string[], type?: string): Answer | undefined {
  if (type === "file") return undefined;
  for (const r of RULES) {
    if (r.test.test(label)) {
      const v = r.answer(options);
      return v ? { value: v, source: "rule" } : undefined;
    }
  }
  return undefined;
}

/** Free-text questions that need a human: cover letter, why us, salary, deadlines, anything essay-like. */
export function needsHuman(label: string, type?: string): boolean {
  if (type === "textarea") return true;
  return /why (do you want|are you interested|us|this role|company)|cover letter|salary|compensation|expect(ed|ation)|deadline|timeline|tell us|describe|explain|anything else|additional information|personal preferences|address/i.test(label);
}
