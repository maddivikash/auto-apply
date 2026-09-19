/**
 * First drafts for the free-text questions no rule can answer ("Why us?", "Hardest problem you
 * worked on"). Written from the profile and the posting, shown in the app as editable defaults and
 * marked as drafts, so the person always sees them before anything is submitted.
 */
import { chatJson } from "../llm/workersai";
import type { JobPosting } from "../jobs/fetch";
import type { Profile } from "../profile/types";
import type { QuestionState } from "../store";
import { profileNumbers } from "../profile/types";

const WORDS: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", fifteen: "15", twenty: "20", thirty: "30", fifty: "50", hundred: "100", thousand: "1000" };

/**
 * A draft may only state numbers the profile states. Years, percentages, counts and money written as
 * digits or as words are all checked; a single unsupported figure rejects the whole draft, because a
 * recruiter cannot tell which sentence to distrust.
 */
export function draftSupported(text: string, profile: Profile, extraNumbers: string[] = []): { ok: boolean; offending?: string } {
  const known = new Set([...profileNumbers(profile)].map((n) => n.replace(/[^\d.]/g, "")));
  for (const e of extraNumbers) known.add(e.replace(/[^\d.]/g, ""));
  const found = [...text.matchAll(/\b(\d[\d,]*(?:\.\d+)?)\s*(%|k\b|x\b|\+)?|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|fifty|hundred|thousand)\b(?=\s+(?:years?|months?|percent|%|people|users?|engineers?|teams?|services?|projects?|x\b|times))/gi)];
  for (const m of found) {
    const raw = m[1] ? m[1].replace(/,/g, "") : WORDS[m[3].toLowerCase()];
    if (!raw) continue;
    if (/^(19|20)\d{2}$/.test(raw)) continue; // years as dates are fine
    if (!known.has(raw) && !known.has(raw.replace(/\.0+$/, ""))) return { ok: false, offending: m[0] };
  }
  return { ok: true };
}

/** Questions about the person's own data, money or logistics are never drafted; those come from settings or the person. */
const NOT_DRAFTABLE = /salary|compensation|ctc|pay\b|notice|gpa|url|link|profile|website|portfolio|phone|email|name\b|location|city|country|date|when can|pronoun|twitter|github|linkedin|referr|hear about|visa|sponsor|authori|relocat|years? of|how many|start date|availability|office/i;

export function draftable(q: QuestionState): boolean {
  if (q.answer || q.options?.length || q.type === "file" || q.type === "checkbox") return false;
  if (NOT_DRAFTABLE.test(q.label)) return false;
  return q.type === "textarea" || (q.type === "text" && /\?|describe|tell us|explain|why|what|how/i.test(q.label) && q.label.length > 20);
}

export async function draftAnswers(job: JobPosting, profile: Profile, questions: QuestionState[]): Promise<number> {
  const targets = questions.filter(draftable);
  if (!targets.length) return 0;
  const system = `You write short first-person answers to job application questions for one candidate. Use only facts from the candidate's profile and the job description. Plain, specific, no buzzwords, no em dashes, no exclamation marks. Never invent projects, numbers, employers or opinions the profile does not support. When asked why this company, refer to concrete things the job description says the company builds or does. Return JSON only.`;
  const user = `CANDIDATE PROFILE:
${JSON.stringify({ roles: profile.roles, projects: profile.projects, skills: profile.skills, achievements: profile.achievements }, null, 1).slice(0, 9000)}

JOB at ${job.company}: ${job.title}
${job.description.slice(0, 5000)}

QUESTIONS (answer each; textarea questions get 70 to 120 words, text questions at most 40 words):
${targets.map((q, i) => `${i + 1}. [${q.type}] ${q.label}`).join("\n")}

Return {"answers": [{"n": 1, "answer": "..."}, ...]} with one entry per question, in order.`;
  const out = await chatJson<{ answers: { n: number; answer: string }[] }>([{ role: "system", content: system }, { role: "user", content: user }], { maxTokens: 1800 });
  let n = 0;
  for (const a of out.answers || []) {
    const q = targets[a.n - 1];
    const text = (a.answer || "").replace(/[\u2013\u2014]/g, ",").trim();
    if (!q || text.length < 20) continue;
    const check = draftSupported(text, profile);
    if (!check.ok) { console.warn(`draft for "${q.label.slice(0, 50)}" dropped: "${check.offending}" is not in the profile`); continue; }
    q.answer = text; q.source = "ai"; q.needsHuman = false; n++;
  }
  return n;
}
