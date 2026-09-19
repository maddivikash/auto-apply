/**
 * First drafts for the free-text questions no rule can answer ("Why us?", "Hardest problem you
 * worked on"). Written from the profile and the posting, shown in the app as editable defaults and
 * marked as drafts, so the person always sees them before anything is submitted.
 */
import { chatJson } from "../llm/workersai";
import type { JobPosting } from "../jobs/fetch";
import type { Profile } from "../profile/types";
import type { QuestionState } from "../store";

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
    const text = (a.answer || "").replace(/[–—]/g, ",").trim();
    if (!q || text.length < 20) continue;
    q.answer = text; q.source = "ai"; q.needsHuman = false; n++;
  }
  return n;
}
