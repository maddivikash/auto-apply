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
  raw.education = Array.isArray(raw.education) ? raw.education : raw.education ? [raw.education] : [];
  for (const r of raw.roles || []) r.bullets = (r.bullets || []).map((b: any, i: number) => typeof b === "string" ? { id: `b${i}`, tags: [], text: b } : { id: b.id || `b${i}`, tags: b.tags || [], text: b.text });
  return Profile.parse(raw);
}
