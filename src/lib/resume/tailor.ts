import { MASTER, bankNumbers } from "../profile/master";
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
- Bold one to three key terms per bullet by wrapping them in double asterisks, like **Kubernetes** or **400ms to 30ms**. Bold facts and tools, not verbs. Asterisks count toward the length limit.
- Group headings are short noun phrases that mirror the JD's themes, like "Agentic AI Workloads in Production" or "Platform, Deployment and Reliability".
- Order skills groups by relevance to the JD. Drop skill groups and items the JD would not care about. Do not add skills that are not in the master.
- Total length must fit one US Letter page: at most 4 groups for VMock with 2 to 3 bullets each, 1 bullet for the internship, 1 or 2 projects with 1 or 2 bullets, 5 to 6 skill groups, 2 achievements.
`;

export type TailorResult = {
  resume: TailoredResume;
  jdSummary: string;
  fitNotes: string[];
  warnings: string[];
};

export async function tailorResume(job: JobPosting): Promise<TailorResult> {
  const system = `You tailor one candidate's resume to one job description. You are given the candidate's complete master profile as JSON and the job. You select and regroup the most relevant material and return JSON only, matching the schema exactly. ${STYLE_RULES}`;

  const user = `MASTER PROFILE (the only source of facts):
${JSON.stringify({ roles: MASTER.roles, projects: MASTER.projects, skills: MASTER.skills, coursework: MASTER.coursework, achievements: MASTER.achievements }, null, 1)}

JOB:
Company: ${job.company}
Title: ${job.title}
Location: ${job.location}
Description:
${job.description.slice(0, 9000)}

Return this JSON shape:
{
  "headline": "short label for this version, e.g. 'Platform engineer, developer productivity'",
  "jdSummary": "two sentences on what this job really wants",
  "fitNotes": ["3 to 5 short notes on which master facts map to which JD requirements"],
  "roles": [
    { "company": "VMock", "title": "Full Stack Developer", "start": "August 2022", "end": "Present",
      "groups": [ { "heading": "...", "bullets": ["...", "..."] } ] },
    { "company": "Karomi Technologies", "title": "Deep Learning Intern", "start": "May 2021", "end": "August 2021",
      "groups": [ { "heading": "Deep Learning Intern", "bullets": ["..."] } ] }
  ],
  "projects": [ { "name": "...", "stack": "...", "year": "2026", "bullets": ["..."] } ],
  "skills": [ { "label": "Languages", "items": ["..."] } ],
  "coursework": ["..."],
  "achievements": ["...", "..."]
}`;

  const raw = await chatJson<any>([{ role: "system", content: system }, { role: "user", content: user }], { maxTokens: 6000 });
  const { jdSummary = "", fitNotes = [], ...rest } = raw;
  const resume = TailoredResume.parse(rest);
  const warnings = validate(resume);
  return { resume, jdSummary, fitNotes, warnings };
}

/** Deterministic checks the model cannot talk its way past. */
export function validate(resume: TailoredResume): string[] {
  const warnings: string[] = [];
  const allowed = bankNumbers();
  const bankText = JSON.stringify(MASTER).toLowerCase();
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
  const fix = (s: string) => s.replace(/\s*[–—]\s*/g, ", ").replace(/\s+,/g, ",");
  return {
    ...resume,
    roles: resume.roles.map((r) => ({ ...r, groups: r.groups.map((g) => ({ heading: fix(g.heading), bullets: g.bullets.map(fix) })) })),
    projects: resume.projects.map((p) => ({ ...p, bullets: p.bullets.map(fix) })),
    achievements: resume.achievements.map(fix)
  };
}
