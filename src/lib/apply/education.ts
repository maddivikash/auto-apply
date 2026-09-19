/**
 * Education from the profile, in the pieces application forms ask for. Pure functions, shared by
 * the answer rules (server) and the runner (browser automation). Nothing here knows about a DOM.
 */
import type { Profile } from "../profile/types";

export type DegreeLevel = "high_school" | "associate" | "bachelor" | "master" | "mba" | "phd" | "md" | "jd" | "engineer" | "other";

export type ParsedEducation = {
  school: string;
  /** The degree as written, e.g. "Bachelor of Technology in Mechanical Engineering". */
  degreeText: string;
  level: DegreeLevel;
  /** Field of study, e.g. "Mechanical Engineering". Empty when the degree string has none. */
  discipline: string;
  startMonth?: string; startYear?: string; endMonth?: string; endYear?: string;
  /** True when the end reads Present, Expected or lies in the future. */
  current: boolean;
  gpa: string;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOf = (s: string) => { const m = MONTHS.findIndex((x) => new RegExp(`^${x.slice(0, 3)}`, "i").test(s)); return m >= 0 ? MONTHS[m] : undefined; };

const LEVELS: [RegExp, DegreeLevel][] = [
  [/\b(ph\.?\s?d|doctor of philosophy|doctorate|d\.?phil)\b/i, "phd"],
  [/\b(m\.?\s?d\.?|doctor of medicine|mbbs)\b/i, "md"],
  [/\b(j\.?\s?d\.?|juris doctor|ll\.?b|ll\.?m)\b/i, "jd"],
  [/\b(m\.?\s?b\.?\s?a|master of business admin)/i, "mba"],
  [/\b(m\.?\s?(s|sc|tech|e|eng|a|arch|des|phil|res|ca|com)\b|master(?:'s| of|s)?\b|mtech|msc|dual degree)/i, "master"],
  [/\b(b\.?\s?(s|sc|tech|e|eng|a|arch|des|com|ba|fa|c\.?a)\b|bachelor(?:'s| of|s)?\b|btech|bsc|be\b|undergraduate)/i, "bachelor"],
  [/\b(associate|a\.?\s?a\.?s?|diploma|polytechnic)\b/i, "associate"],
  [/\b(high school|secondary|12th|intermediate|hsc|cbse|isc)\b/i, "high_school"],
];

/** Label→regex for the option lists forms use for degree. Ordered from most to least specific. */
export function degreeOptionPatterns(level: DegreeLevel): RegExp[] {
  switch (level) {
    case "phd": return [/ph\.?\s?d|doctor of philosophy|doctorate/i];
    case "md": return [/m\.?\s?d\.?\)|doctor of medicine|medical/i];
    case "jd": return [/j\.?\s?d\.?\)|juris|law/i];
    case "mba": return [/m\.?b\.?a|business administration/i, /master/i];
    case "master": return [/^master'?s?\b(?!.*business)/i, /master/i, /graduate/i];
    case "bachelor": return [/^bachelor/i, /bachelor|undergraduate|b\.?s\.?\b|b\.?a\.?\b/i];
    case "associate": return [/associate|diploma/i];
    case "high_school": return [/high school|secondary/i];
    case "engineer": return [/engineer'?s? degree/i, /bachelor/i];
    default: return [/other/i];
  }
}

export function parseEducation(e: Profile["education"][number]): ParsedEducation {
  const degreeText = (e.degree || "").trim();
  const level = LEVELS.find(([re]) => re.test(degreeText))?.[1] ?? "other";
  // "Bachelor of Technology in Mechanical Engineering" / "B.Tech, Computer Science" / "MS (Data Science)"
  // "Bachelor of Engineering in Computer Science" -> the part after "in"; "Master of Data Science" -> after "of"
  // unless it is a degree family word (Technology, Science, Arts, Engineering); "B.Tech, Computer Science" -> after the comma.
  const disc = /\bin\s+([^,()]+?)\s*(?:,|\(|$)/i.exec(degreeText)?.[1]
    || /\bof\s+(?!(?:technology|science|arts|engineering|business administration|philosophy|medicine|laws?)\b)([^,()]+?)\s*(?:,|\(|$)/i.exec(degreeText)?.[1]
    || /[,(]\s*([^,()]+?)\s*\)?\s*$/.exec(degreeText)?.[1]
    || "";
  const discipline = disc.replace(/\b(major|honou?rs?)\b/gi, "").replace(/\s+/g, " ").trim();
  const dates = (e.dates || "").replace(/[–—]/g, "-");
  const parts = dates.split(/\s*(?:-|to|until)\s*/i).map((s) => s.trim()).filter(Boolean);
  const yearOf = (s: string) => /\b((?:19|20)\d{2})\b/.exec(s)?.[1];
  const [start, end] = parts.length >= 2 ? [parts[0], parts[1]] : [undefined, parts[0]];
  const current = !!end && /present|current|expected|ongoing/i.test(end);
  return {
    school: (e.school || "").trim(), degreeText, level, discipline,
    startMonth: start && monthOf(start), startYear: start && yearOf(start),
    endMonth: end && monthOf(end), endYear: end && yearOf(end), current,
    gpa: (e.gpa || "").trim()
  };
}

/** Most recent first, the way forms and recruiters expect. */
export function parsedEducation(list: Profile["education"] | undefined): ParsedEducation[] {
  return (list || []).map(parseEducation).sort((a, b) => Number(b.endYear || 9999) - Number(a.endYear || 9999));
}

const RANK: Record<DegreeLevel, number> = { high_school: 1, associate: 2, bachelor: 3, engineer: 3, master: 4, mba: 4, jd: 5, md: 5, phd: 6, other: 0 };
export const highestEducation = (list: ParsedEducation[]) => [...list].sort((a, b) => RANK[b.level] - RANK[a.level])[0];

/** Score how well an option text matches a discipline, for lists like Greenhouse's 72 disciplines. */
export function disciplineScore(option: string, discipline: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !["and", "the", "other", "general", "studies"].includes(w));
  const a = norm(option), b = norm(discipline);
  if (!b.length || !a.length) return 0;
  if (option.toLowerCase().includes(discipline.toLowerCase())) return 1;
  const stem = (w: string) => w.slice(0, 6);
  const as = new Set(a.map(stem));
  const shared = b.filter((w) => as.has(stem(w))).length;
  return shared / new Set([...a.map(stem), ...b.map(stem)]).size; // Jaccard on stems: 1 is identical, 0 is disjoint
}
/** Below this, a discipline list has no honest match and the form's "Other" is the right pick. */
export const DISCIPLINE_MIN = 0.3;

/** School name variants to try in a search box, longest first: full, without parentheses, acronym-stripped. */
export function schoolQueries(school: string): string[] {
  const out = new Set<string>();
  const base = school.replace(/\s+/g, " ").trim();
  out.add(base);
  out.add(base.replace(/\s*\([^)]*\)/g, "").trim());
  out.add(base.replace(/^(the )/i, "").replace(/,.*$/, "").trim());
  return [...out].filter(Boolean);
}
