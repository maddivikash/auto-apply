/* eslint-disable @typescript-eslint/no-explicit-any -- model output is untyped until parsed with zod */
import { extractText, getDocumentProxy } from "unpdf";
import { chatJson } from "../llm/workersai";
import { Profile } from "./types";
import { MASTER } from "./master";

export async function pdfToText(buf: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(buf);
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n") : text).replace(/[ \t]+\n/g, "\n").trim();
}

/** Turn resume text into the structured profile. Only restructures; never invents. */
export async function textToProfile(text: string): Promise<Profile> {
  const example = { ...MASTER, roles: MASTER.roles.slice(0, 1).map((r) => ({ ...r, bullets: r.bullets.slice(0, 2) })), projects: MASTER.projects.slice(0, 1) };
  const system = `You convert a resume into a strict JSON profile. Copy facts exactly; do not invent, merge or embellish. Every bullet from the resume must appear once as a bullet in the profile, lightly cleaned of line-break artifacts. Give each bullet a short id and 1 to 3 lowercase tags describing what it demonstrates (for example "backend", "llm", "leadership", "data"). Group skills under the resume's own headings; if there are none, use sensible groups. Dates stay as written. Return JSON only.`;
  const user = `Example of the target shape (values are from a different person, do not copy them):\n${JSON.stringify(example, null, 1)}\n\nResume text:\n${text.slice(0, 14000)}`;
  const raw = await chatJson<any>([{ role: "system", content: system }, { role: "user", content: user }], { maxTokens: 7000 });
  return Profile.parse(normalizeProfile(raw));
}

/** Models drift on shape: bullets as objects or strings, skills as arrays, education as one object. Accept all of it. */
export function normalizeProfile(raw: any) {
  const str = (v: any) => (typeof v === "string" ? v : v?.text ?? v?.name ?? (v == null ? "" : String(v))).trim();
  const out: any = { ...raw };
  out.education = (Array.isArray(raw.education) ? raw.education : raw.education ? [raw.education] : []).map((e: any) => ({ school: str(e.school || e.institution), place: str(e.place || e.location), degree: str(e.degree), dates: str(e.dates || [e.start, e.end].filter(Boolean).join(" – ")), gpa: str(e.gpa || e.grade) }));
  out.roles = (raw.roles || raw.experience || []).map((r: any) => ({
    company: str(r.company), title: str(r.title || r.role), location: r.location ? str(r.location) : undefined, start: str(r.start || r.dates?.split("–")[0]), end: str(r.end || "Present"),
    bullets: (r.bullets || []).map((b: any, i: number) => ({ id: str(b?.id) || `b${i}`, tags: Array.isArray(b?.tags) ? b.tags.map(str) : [], text: str(b) })).filter((b: any) => b.text.length >= 20)
  }));
  out.projects = (raw.projects || []).map((p: any) => ({ name: str(p.name), stack: str(p.stack || p.tech || (Array.isArray(p.technologies) ? p.technologies.join(", ") : "")), year: str(p.year || p.dates), tags: Array.isArray(p.tags) ? p.tags.map(str) : [], bullets: (p.bullets || []).map(str).filter((t: string) => t.length >= 20) })).filter((p: any) => p.bullets.length);
  if (Array.isArray(raw.skills)) out.skills = Object.fromEntries(raw.skills.map((g: any) => [str(g.label || g.group || g.name), (g.items || g.skills || []).map(str)]));
  else out.skills = Object.fromEntries(Object.entries(raw.skills || {}).map(([k, v]) => [k, Array.isArray(v) ? v.map(str) : String(v).split(",").map((x) => x.trim()).filter(Boolean)]));
  out.coursework = (raw.coursework || []).map(str); out.achievements = (raw.achievements || []).map(str);
  for (const k of ["name", "phone", "email", "linkedin", "github", "website", "location", "gender"]) out[k] = str(raw[k]);
  return out;
}
