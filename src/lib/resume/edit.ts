/**
 * Hand edits from the resume editor. The editor sends the whole resume back; it is parsed with
 * looser limits than the model's output (a person may write a short bullet or a third project),
 * because renderPdf still fits whatever comes back on one page.
 */
import { z } from "zod";
import { chat } from "../llm/workersai";
import { profileNumbers, type Profile } from "../profile/types";
import type { TailoredResume } from "./schema";

const text = (max: number) => z.string().transform((s) => s.replace(/\s+/g, " ").trim()).pipe(z.string().max(max));
const bullets = (max: number) => z.array(text(320)).transform((a) => a.filter(Boolean)).pipe(z.array(z.string()).max(max));

export const EditedResume = z.object({
  headline: z.string().max(120).optional(),
  roles: z.array(z.object({
    company: text(120).pipe(z.string().min(1, "Every role needs a company")),
    title: text(120).pipe(z.string().min(1, "Every role needs a title")),
    start: text(40),
    end: text(40),
    groups: z.array(z.object({ heading: text(80), bullets: bullets(8) })).transform((g) => g.filter((x) => x.bullets.length)).pipe(z.array(z.any()).min(1, "Every role needs at least one bullet"))
  })).min(1, "Keep at least one role").max(4),
  projects: z.array(z.object({ name: text(120).pipe(z.string().min(1)), stack: text(100), year: text(20), bullets: bullets(4) })).max(4).default([]),
  skills: z.array(z.object({ label: text(60), items: z.array(text(60)).transform((a) => a.filter(Boolean)) }))
    .transform((s) => s.filter((x) => x.label && x.items.length)).pipe(z.array(z.any()).max(10)),
  coursework: z.array(text(80)).transform((a) => a.filter(Boolean)).optional(),
  achievements: z.array(text(320)).transform((a) => a.filter(Boolean)).default([])
});

export function parseEdited(input: unknown): { ok: true; resume: TailoredResume } | { ok: false; error: string } {
  const r = EditedResume.safeParse(input);
  if (!r.success) return { ok: false, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 3).join("; ") };
  return { ok: true, resume: r.data as TailoredResume };
}

/**
 * Rewrite one bullet. Same honesty rules as tailoring: no new numbers, tools or employers. The
 * answer is checked for invented numbers and rejected rather than shown.
 */
export async function rewriteBullet(bullet: string, profile: Profile, opts: { instruction?: string; jobTitle?: string; jd?: string } = {}): Promise<string> {
  const system = `You rewrite one resume bullet. Return only the rewritten bullet, nothing else: no quotes, no preface.
Rules:
- One sentence, 60 to 220 characters, starts with a strong verb or noun phrase, ends with a full stop.
- Keep every fact true. Use only numbers, tools, products and companies that appear in the original bullet or the candidate's profile. Never invent a metric.
- Plain, specific, first-hand. No "leveraged", "spearheaded", "synergy", "passionate", "cutting-edge", "robust", "seamless". No em or en dashes.
- Lead with the outcome when the original has one. Cut filler and purpose clauses that add no fact.
- Bold one to three key terms (tools or results, not verbs) by wrapping them in double asterisks, like **Kubernetes**.`;
  const user = `CANDIDATE PROFILE (the only source of facts):
${JSON.stringify({ roles: profile.roles, projects: profile.projects, skills: profile.skills }).slice(0, 12000)}
${opts.jobTitle ? `\nTARGET ROLE: ${opts.jobTitle}\n${(opts.jd || "").slice(0, 2500)}\nPrefer the role's vocabulary only where it is an honest synonym. Do not copy phrases from it.\n` : ""}
BULLET TO REWRITE:
${bullet}
${opts.instruction?.trim() ? `\nTHE CANDIDATE ASKS: ${opts.instruction.trim().slice(0, 400)}` : "\nMake it sharper and more specific."}`;
  const out = (await chat([{ role: "system", content: system }, { role: "user", content: user }], { maxTokens: 600 }))
    .trim().split("\n").map((l) => l.trim()).filter(Boolean).pop() ?? "";
  const clean = out.replace(/^[-*•\s"]+|["\s]+$/g, "").replace(/\s*[–—]\s*/g, ", ");
  if (clean.length < 20) throw new Error("The rewrite came back empty. Try again, or give it a short instruction.");
  const allowed = profileNumbers(profile);
  const source = `${bullet} ${JSON.stringify(profile)}`;
  for (const n of clean.match(/\d[\d,.]*\s*(%|x|k\+|\+)?/g) || []) {
    const key = n.replace(/\s+/g, "");
    if (!allowed.has(key) && !source.includes(key.replace(/[%x+]|k\+$/g, ""))) throw new Error(`The rewrite used a number that is not in your profile (${n.trim()}), so it was discarded. Try again.`);
  }
  return clean;
}
