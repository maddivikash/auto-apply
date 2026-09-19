/* eslint-disable @typescript-eslint/no-explicit-any -- model output is untyped until parsed with zod */
import { profileNumbers, type Profile } from "../profile/types";
import type { JobPosting } from "../jobs/fetch";
import { chatJson } from "../llm/workersai";
import { TailoredResume } from "./schema";

const BULLET_MAX = 230;

const STYLE_RULES = `
Writing rules, all mandatory:
- Sound like the candidate wrote it: plain, specific, first-hand. No buzzword strings, no "leveraged", "spearheaded", "synergy", "passionate", "cutting-edge", "robust", "seamless".
- No em dashes or en dashes anywhere. Use commas, colons or full stops. Hyphens inside words are fine.
- Each bullet is one sentence, 40 to ${BULLET_MAX} characters, starts with a verb or a noun phrase, ends with a full stop. No paragraphs.
- Every number, percentage, tool, product and company must already appear in the master profile. Do not invent, round differently, or combine numbers. If the job needs something the candidate has not done, leave it out.
- Prefer the master's own wording. Rephrase only to match the job's vocabulary (for example say "platform" if the JD says platform), tighten, or merge two bullets that belong together.
- Do not overfit. Tailoring is choosing and ordering the master's material, not rewriting it around this posting. Limits: at most three vocabulary swaps across the whole resume; never copy a phrase of more than three words from the JD; never mention the company, the team or the job title in a bullet or heading; the headline describes what the candidate is, not the job ad; group headings name the candidate's real work, not the JD's requirement list. A reader should not be able to tell which posting the resume was written for. Only the candidate's own regenerate instructions may relax these limits, and only as far as they say.
- Bold one to three key terms per bullet by wrapping them in double asterisks, like **Kubernetes** or **400ms to 30ms**. Bold facts and tools, not verbs. Asterisks count toward the length limit.
- Group headings are short noun phrases that mirror the JD's themes, like "Agentic AI Workloads in Production" or "Platform, Deployment and Reliability".
- Order skills groups by relevance to the JD. Drop skill groups and items the JD would not care about. Do not add skills that are not in the master.
- Do not pad a bullet with a purpose clause that is not in the master, such as "ensuring reliable processing", "enabling safe actions", "improving user experience", "delivering value". End the bullet where the fact ends.
- Do not merge facts from two different master bullets into one sentence unless both facts remain exactly true of the same piece of work.
- Budget, strictly: the most recent role has 3 or 4 groups and 8 to 9 bullets in total. Each earlier role has 1 or 2 bullets in a single group whose heading is the job title. Projects: pick 1 project with 2 bullets, or 2 projects with 1 bullet each. 5 or 6 skill groups (fewer if the master has fewer). Up to 2 achievements, only those in the master; none if the master has none. Coursework only if the JD asks for fundamentals or the role is junior; otherwise omit it.
- Projects: prefer the most recent ones (newest year first). Pick a project more than three years old only when the JD is specifically about that domain and no recent project covers it.
- If the master has less material than the budget, use everything relevant that exists and stop there. Never invent, split or pad to reach the budget; a shorter resume is fine.
`;

export type TailorResult = {
  resume: TailoredResume;
  jdSummary: string;
  fitNotes: string[];
  warnings: string[];
};

export type TailorOptions = {
  /** Free-text instructions from the candidate for this revision ("lead with the proxy project", "shorter bullets"). */
  notes?: string;
  /** The version the candidate is reacting to, so the model revises instead of starting over. */
  previous?: TailoredResume;
};

export async function tailorResume(job: JobPosting, profile: Profile, opts: TailorOptions = {}): Promise<TailorResult> {
  const system = `You tailor one candidate's resume to one job description. You are given the candidate's complete master profile as JSON and the job. You select and regroup the most relevant material and return JSON only, matching the schema exactly. ${STYLE_RULES}`;

  const user = `MASTER PROFILE (the only source of facts):
${JSON.stringify({ roles: profile.roles, projects: profile.projects, skills: profile.skills, coursework: profile.coursework, achievements: profile.achievements }, null, 1)}

JOB:
Company: ${job.company}
Title: ${job.title}
Location: ${job.location}
Description:
${job.description.slice(0, 9000)}

${opts.previous && opts.notes ? `PREVIOUS VERSION (the candidate saw this and wants changes):
${JSON.stringify(opts.previous, null, 1)}

CANDIDATE INSTRUCTIONS for this revision, follow them exactly where the master profile allows:
${opts.notes.trim().slice(0, 1500)}
Keep everything the instructions do not mention as it was in the previous version. If an instruction asks for a fact, project or skill that is not in the master profile, do not invent it; leave it out and say so in one fitNotes entry starting with "Not in profile:".

` : opts.notes ? `CANDIDATE INSTRUCTIONS, follow them exactly where the master profile allows:
${opts.notes.trim().slice(0, 1500)}
If an instruction asks for a fact, project or skill that is not in the master profile, do not invent it; leave it out and say so in one fitNotes entry starting with "Not in profile:".

` : ""}Return this JSON shape:
{
  "headline": "short label for this version, e.g. 'Platform engineer, developer productivity'",
  "jdSummary": "two sentences on what this job really wants",
  "fitNotes": ["3 to 5 short notes on which master facts map to which JD requirements"],
  "roles": [
    { "company": "<most recent company, exactly as in the profile>", "title": "<title>", "start": "<start>", "end": "<end>",
      "groups": [ { "heading": "...", "bullets": ["...", "..."] } ] },
    { "company": "<earlier company>", "title": "<title>", "start": "<start>", "end": "<end>",
      "groups": [ { "heading": "<title>", "bullets": ["..."] } ] }
  ],
  "projects": [ { "name": "...", "stack": "...", "year": "2026", "bullets": ["..."] } ],
  "skills": [ { "label": "Languages", "items": ["..."] } ],
  "coursework": ["..."],
  "achievements": ["...", "..."]
}`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
  let raw = await chatJson<any>(messages, { maxTokens: 6000 });
  let { jdSummary = "", fitNotes = [], ...rest } = raw;
  let parsed = TailoredResume.safeParse(normalize(rest));
  if (!parsed.success) {
    // One repair round: show the model its own JSON and the exact schema errors.
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    messages.push({ role: "assistant", content: JSON.stringify(raw) });
    messages.push({ role: "user", content: `Your JSON failed validation. Fix only these problems and return the full corrected JSON, nothing else:\n${issues}` });
    raw = await chatJson<any>(messages, { maxTokens: 6000 });
    ({ jdSummary = jdSummary, fitNotes = fitNotes, ...rest } = raw);
    parsed = TailoredResume.safeParse(normalize(rest));
    if (!parsed.success) throw new Error(`Resume JSON still invalid after repair: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  const resume = parsed.data;
  const warnings = validate(resume, profile);
  return { resume, jdSummary, fitNotes, warnings };
}

/** Cheap, lossless-enough fixes before strict parsing: cap list lengths, strip dashes, trim whitespace. */
function normalize(r: any): any {
  // Also fold non-breaking hyphens (U+2010/U+2011) the model likes to emit back into plain hyphens.
  const fix = (s: unknown) => String(s ?? "").replace(/[\u2010\u2011]/g, "-").replace(/\s*[–—]\s*/g, ", ").replace(/(\d)\s+(%|ms|x\b)/g, "$1$2").replace(/\s+,/g, ",").replace(/\s+/g, " ").trim();
  const cap = <T,>(a: T[] | undefined, n: number) => (Array.isArray(a) ? a.slice(0, n) : a);
  return {
    ...r,
    roles: cap(r.roles, 2)?.map((role: any) => ({
      ...role,
      groups: cap(role.groups, 4)?.map((g: any) => ({ heading: fix(g.heading).slice(0, 60), bullets: cap(g.bullets, 4)?.map(fix) }))
    })),
    projects: cap(r.projects, 2)?.map((p: any) => ({ ...p, stack: fix(p.stack).slice(0, 70), bullets: cap(p.bullets, 2)?.map(fix) })),
    skills: cap(r.skills, 7)?.map((s: any) => ({ label: fix(s.label).slice(0, 40), items: cap(s.items, 12)?.map(fix) })),
    coursework: cap(r.coursework, 6),
    achievements: cap(r.achievements, 2)?.map(fix)
  };
}

/** Deterministic checks the model cannot talk its way past. */
export function validate(resume: TailoredResume, profile: Profile): string[] {
  const warnings: string[] = [];
  const allowed = profileNumbers(profile);
  const bankText = JSON.stringify(profile).toLowerCase();
  const bullets: string[] = [];
  for (const r of resume.roles) for (const g of r.groups) bullets.push(...g.bullets);
  for (const p of resume.projects) bullets.push(...p.bullets);
  bullets.push(...resume.achievements);

  for (const b of bullets) {
    if (/[–—]/.test(b)) warnings.push(`Dash in bullet: "${b.slice(0, 60)}"`);
    if (b.length > BULLET_MAX) warnings.push(`Bullet over ${BULLET_MAX} chars: "${b.slice(0, 60)}"`);
    for (const n of b.match(/\d[\d,.]*\s*(%|x|k\+|\+)?/g) || []) {
      const key = n.replace(/\s+/g, "");
      const bare = key.replace(/[%x+]|k\+$/g, "");
      if (!allowed.has(key) && !bankText.includes(bare)) warnings.push(`Number not in master: "${n}" in "${b.slice(0, 60)}"`);
    }
  }
  for (const s of resume.skills) for (const item of s.items) {
    if (!bankText.includes(item.toLowerCase().replace(/\s*\(.*\)\s*/g, "").slice(0, 12))) warnings.push(`Skill not in master: "${item}"`);
  }
  return warnings;
}

/** Strip dashes if the model slipped; keeps the render honest even when a warning fires. */
export function sanitize(resume: TailoredResume): TailoredResume {
  const fix = (s: string) => s.replace(/[\u2010\u2011]/g, "-").replace(/\s*[–—]\s*/g, ", ").replace(/\s+,/g, ",");
  return {
    ...resume,
    roles: resume.roles.map((r) => ({ ...r, groups: r.groups.map((g) => ({ heading: fix(g.heading), bullets: g.bullets.map(fix) })) })),
    projects: resume.projects.map((p) => ({ ...p, bullets: p.bullets.map(fix) })),
    achievements: resume.achievements.map(fix)
  };
}
