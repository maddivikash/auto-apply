/**
 * The answer bank: every answer the user typed on an application form, keyed on the question's
 * wording, so the same question on the next form is already filled. Company-specific questions
 * ("Why Cloudflare?") and accepted AI drafts are never banked: they would be wrong anywhere else.
 */
import { getDoc, putDoc } from "../docs";
import type { Application, QuestionState } from "../store";

export type BankUse = { appId: string; company: string; title: string; at: string };
export type BankEntry = { label: string; answer: string; type: QuestionState["type"]; updatedAt: string; uses: BankUse[] };
export type AnswerBank = Record<string, BankEntry>;

const path = (userId: string) => `users/${userId}/answer-bank.json`;
export const getBank = async (userId: string): Promise<AnswerBank> => (await getDoc<AnswerBank>(path(userId))) ?? {};
export const saveBank = (userId: string, bank: AnswerBank) => putDoc(path(userId), bank);

/** Same question, different punctuation or casing: "When can you start?*" and "when can you start" share a key. */
export function bankKey(label: string): string {
  return label.toLowerCase().replace(/\((required|optional)[^)]*\)|\*/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Questions whose answer only makes sense for one company. */
export function companySpecific(label: string, company?: string): boolean {
  const l = label.toLowerCase();
  if (company && company.length > 2 && l.includes(company.toLowerCase())) return true;
  return /\bwhy (do you want|would you like|are you interested|are you excited|us\b|join|this (role|company|team|position))|\bwhat (excites|interests|draws) you (about|to) (us|our|this)|\b(our|this) (company|mission|product|team)\b/i.test(label);
}

/** The banked answer for a question, if one fits. A choice question only takes an answer that is one of its options. */
export function bankAnswer(bank: AnswerBank, q: Pick<QuestionState, "label" | "options" | "type">, company?: string): string | undefined {
  if (q.type === "file" || companySpecific(q.label, company)) return undefined;
  const e = bank[bankKey(q.label)];
  if (!e?.answer) return undefined;
  if (q.options?.length) return q.options.find((o) => o.trim().toLowerCase() === e.answer.trim().toLowerCase());
  return e.answer;
}

/** Add the user's own answers from one application to the bank. Returns true when the bank changed. */
export function recordAnswers(bank: AnswerBank, app: Application): boolean {
  let changed = false;
  const at = new Date().toISOString();
  const use: BankUse = { appId: app.id, company: app.job?.company || "", title: app.job?.title || "", at };
  for (const q of app.questions) {
    if (q.source !== "user" || q.fromDraft || !q.answer?.trim() || q.type === "file" || companySpecific(q.label, app.job?.company)) continue;
    const key = bankKey(q.label);
    if (!key) continue;
    const prev = bank[key];
    const uses = [use, ...(prev?.uses || []).filter((u) => u.appId !== app.id)].slice(0, 20);
    if (prev?.answer === q.answer && prev.uses.some((u) => u.appId === app.id)) continue;
    bank[key] = { label: prev?.label || q.label, answer: q.answer, type: q.type, updatedAt: at, uses };
    changed = true;
  }
  return changed;
}
