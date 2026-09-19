/**
 * First drafts for the free-text questions no rule can answer ("Why us?", "Hardest problem you
 * worked on"). Written from the profile and the posting, shown in the app as editable defaults and
 * marked as drafts, so the person always sees them before anything is submitted.
 */
import { chatJson } from "../llm/workersai";
import type { JobPosting } from "../jobs/fetch";
import type { Profile } from "../profile/types";
import type { QuestionState } from "../store";
import { profileNumbers, type Settings } from "../profile/types";
import { yearsFrom } from "./answers";

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

/** Money, contact details, logistics and legal status are never drafted; those come from settings or the person. */
const NOT_DRAFTABLE = /salary|compensation|ctc|\bpay\b|notice|gpa|url|link|profile|website|portfolio|phone|email|\bname\b|location|city|country|\bdate\b|when can|pronoun|twitter|github|linkedin|referr|hear about|visa|sponsor|authori|relocat|start date|availability|office|scholar/i;

export function draftable(q: QuestionState): boolean {
  if (q.answer || q.options?.length || q.type === "file" || q.type === "checkbox") return false;
  if (NOT_DRAFTABLE.test(q.label)) return false;
  return q.type === "textarea" || (q.type === "text" && /\?|describe|tell us|explain|why|what|how|which/i.test(q.label) && q.label.length > 15);
}

/** Figures the profile supports indirectly: total experience and how long each role and project ran. */
function derivedFacts(profile: Profile, settings?: Settings): { lines: string[]; numbers: string[] } {
  const year = (s: string) => Number(/\b((?:19|20)\d{2})\b/.exec(s || "")?.[1]);
  const now = new Date().getFullYear();
  const lines: string[] = []; const numbers: string[] = [];
  const total = settings?.yearsExperience || yearsFrom(profile.roles.map((r) => r.start));
  if (total) { lines.push(`Total professional experience: ${total} years.`); numbers.push(total); }
  for (const r of profile.roles) {
    const a = year(r.start), b = /present|current/i.test(r.end) ? now : year(r.end);
    if (a && b) { const y = Math.max(1, b - a); lines.push(`${r.title} at ${r.company}: about ${y} year${y > 1 ? "s" : ""} (${r.start} to ${r.end}).`); numbers.push(String(y)); }
  }
  return { lines, numbers };
}

/**
 * Draft every draftable open question, or (with `only`) rewrite one specific question, optionally
 * following the person's instructions, the way the resume's Regenerate works.
 */
export async function draftAnswers(job: JobPosting, profile: Profile, questions: QuestionState[], settings?: Settings, only?: { id: string; notes?: string }): Promise<number> {
  const targets = only ? questions.filter((q) => q.id === only.id && q.type !== "file" && !q.options?.length) : questions.filter(draftable);
  if (!targets.length) return 0;
  const instructions = only?.notes?.trim() ? `\nCANDIDATE INSTRUCTIONS for this rewrite, follow them where the profile allows:\n${only.notes.trim().slice(0, 800)}\n${targets[0].answer ? `PREVIOUS ANSWER:\n${targets[0].answer.slice(0, 1200)}\n` : ""}` : "";
  const facts = derivedFacts(profile, settings);
  const system = `You write short first-person answers to job application questions for one candidate. Use only facts from the candidate's profile and the FACTS list. Plain, specific, no buzzwords, no em dashes, no exclamation marks. Never invent projects, numbers, percentages, employers or opinions the profile does not support. If a question asks for a figure the profile and FACTS do not give, answer without the figure or, when the question is only about that figure, return an empty string. When asked why this company, refer to concrete things the job description says the company builds or does. Return JSON only.`;
  const ask = async (qs: QuestionState[], feedback = "") => {
    const user = `CANDIDATE PROFILE:
${JSON.stringify({ roles: profile.roles, projects: profile.projects, skills: profile.skills, achievements: profile.achievements }, null, 1).slice(0, 9000)}

FACTS (derived from the profile, safe to use):
${facts.lines.join("\n") || "(none)"}

JOB at ${job.company}: ${job.title}
${job.description.slice(0, 5000)}

QUESTIONS (answer each; textarea questions get 70 to 120 words, text questions at most 40 words):
${qs.map((q, i) => `${i + 1}. [${q.type}] ${q.label}`).join("\n")}
${instructions}${feedback}
Return {"answers": [{"n": 1, "answer": "..."}, ...]} with one entry per question, in order.`;
    const out = await chatJson<{ answers: { n: number; answer: string }[] }>([{ role: "system", content: system }, { role: "user", content: user }], { maxTokens: 1800 });
    return out.answers || [];
  };
  let n = 0;
  const failed: { q: QuestionState; offending: string }[] = [];
  const accept = (q: QuestionState, raw: string) => {
    const text = (raw || "").replace(/[\u2013\u2014]/g, ",").trim();
    if (text.length < 20) return true; // the model declined: leave empty, nothing to retry
    // "How many years" answers may only use durations derived from the profile's dates, not any digit that happens to appear in it.
    const check = /how (many|long)|years? (of|have you|spent)|experience in years/i.test(q.label) ? draftSupported(text, { ...profile, roles: [], projects: [], skills: {}, achievements: [], coursework: [], education: [] } as typeof profile, facts.numbers) : draftSupported(text, profile, facts.numbers);
    if (!check.ok) { failed.push({ q, offending: check.offending! }); return false; }
    // A draft is a proposal: it is shown, but the person confirms it before it can be filled.
    q.answer = text; q.source = "ai"; q.needsHuman = true; n++; return true;
  };
  for (const a of await ask(targets)) { const q = targets[a.n - 1]; if (q) accept(q, a.answer); }
  if (failed.length) {
    // One rewrite with the offending figures named; whatever still fails stays empty.
    const retry = failed.map((f) => f.q); const notes = failed.map((f, i) => `${i + 1}. "${f.offending}" is not supported by the profile`).join("\n");
    failed.length = 0;
    for (const a of await ask(retry, `\nYOUR PREVIOUS ANSWERS USED FIGURES THE PROFILE DOES NOT SUPPORT:\n${notes}\nRewrite those answers without unsupported figures.`)) { const q = retry[a.n - 1]; if (q) accept(q, a.answer); }
    for (const f of failed) console.warn(`draft for "${f.q.label.slice(0, 50)}" dropped after retry: "${f.offending}" is not in the profile`);
  }
  return n;
}
