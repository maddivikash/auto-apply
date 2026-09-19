/**
 * Keyword match between a job description and a resume, ATS-style and deterministic.
 * Two parts: coverage (how many of the job's key terms the resume contains, weighted by how
 * much the job stresses them) and focus (what share of the resume's lines speak to the job).
 * Tailoring should raise focus a lot and coverage a little; the full profile has more coverage
 * but far less focus. Pure function so it can be unit tested.
 */
import type { Profile } from "../profile/types";
import type { TailoredResume } from "./schema";

const STOP = new Set(("a an and are as at be been being but by for from has have if in into is it its of on or that the this to was were will with you your we our they their them he she his her not no nor so than then there these those which who whom what when where why how all any both each few more most other some such only own same too very can just also about above after again against below between during over under until up down out off once here per via etc " +
  "experience experienced team teams work working works role roles ability able strong years year including include includes using use used etc skills skill knowledge required requirements requirement preferred plus bonus nice good great excellent responsibilities responsibility qualifications qualification candidate candidates ideal looking hire hiring join opportunity company benefits salary equity remote hybrid onsite office location apply application job position title description about us mission product products customers customer users user build building built develop developing developed design designing designed deliver delivering help helping ensure ensuring drive driving lead leading own owning across within environment fast paced startup growth stage senior junior staff engineer engineers engineering software developer development technical technology technologies tools tool solutions solution new best practices practice high quality quality set sets value values low system systems calling level levels way ways need needs make makes like well part time day days world class end scale scaled key must should would could may might get gets take takes come comes go goes bring brings keep keeps every many much various multiple several least large small big real " +
  // filler, contractions split by the tokenizer, hiring-page vocabulary and place names that are not skills
  "cutting equal status snack snacks week weeks leave don doesn isn aren won didn wasn ll ve venture angel first second third next last impact human humans learn case cases based ship shipping shipped support supporting supported one two three without everyone anyone someone matter person people companies runs run running better lots lot things thing stuff something anything everything india indian usa united states america american europe london bangalore bengaluru hyderabad mumbai pune chennai delhi gurugram san francisco york possible met require requires requiring employment employer employers learn invented pioneering founding combine combined efficient primitive").split(/\s+/));

const TECH_HINT = /[+#.]|^(api|apis|sql|aws|gcp|azure|k8s|ci|cd|ml|ai|llm|llms|nlp|rag|etl|sdk|cli|ui|ux|graphql|rest|grpc|oauth|sso|saas|b2b|b2c|kpi|okr|sre|devops|mlops|hft|fpga)$/;

export type Match = {
  /** 0 to 100 for the tailored resume. */
  tailored: number;
  /** 0 to 100 for the full profile rendered as-is, the "before" number. */
  profile: number;
  coverage: number;
  focus: number;
  matched: string[];
  missing: string[];
};

/** Short tokens that are real technical terms and must survive the length filter. */
const SHORT_OK = new Set("ai ml ci cd ui ux go c# c++ r qa sre k8s aws gcp sql nlp llm rag etl sdk cli api sso b2b b2c kpi okr git js ts php ios".split(" "));
const tokens = (s: string) => s.toLowerCase().replace(/\*\*/g, " ").split(/[^a-z0-9+#.]+/).map((t) => t.replace(/^\.+|\.+$/g, ""))
  .filter((t) => !/^\d+$/.test(t) && /[a-z]/.test(t) && (t.length >= 3 || SHORT_OK.has(t)) && !/^[a-z]\.[a-z]\.?$/.test(t));
/** Legal and hiring boilerplate that says nothing about the work: never a keyword worth matching. */
const BOILERPLATE = /visa|sponsor|immigration|authori[sz]ed to work|equal opportunit|accommodat|disabilit|veteran|gender|ethnic|race\b|religion|orientation|export control|sanction|background check|drug|compliance with|applicant|eeo|e-verify|privacy|cookie|benefit|401k|insurance|pto|vacation|perks|compensation|salary|pay range|bonus|stock|equity|cutting edge|cutting-edge|world class|fast paced|fast-paced|passionate|self starter|rockstar|ninja|along|re\b|etc\b|able\b|please|click|submit|resume|interview|hiring process|recruit/i;
const stem = (t: string) => (t.length > 4 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t);

/** Weighted key terms of a job description: unigrams and repeated bigrams, boosted when they look technical. */
const surface = new Map<string, string>(); // stem -> how the job wrote it, for display

export function jobTerms(jd: string, limit = 40, exclude: string[] = []): Map<string, number> {
  // The company's own name is not a skill; strip it and its parts before counting.
  const ex = new Set(exclude.flatMap((e) => tokens(e)).map(stem));
  const toks = tokens(jd).filter((t) => !ex.has(stem(t)));
  const count = new Map<string, number>();
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (STOP.has(t)) continue;
    if (!surface.has(stem(t))) surface.set(stem(t), t);
    count.set(stem(t), (count.get(stem(t)) ?? 0) + 1);
    const n = toks[i + 1];
    if (n && !STOP.has(n) && stem(n) !== stem(t)) { const bg = `${stem(t)} ${stem(n)}`; if (!surface.has(bg)) surface.set(bg, `${t} ${n}`); count.set(bg, (count.get(bg) ?? 0) + 1); }
  }
  const weighted = [...count.entries()]
    .filter(([term, c]) => (term.includes(" ") ? c >= 2 : true))
    .filter(([term]) => !BOILERPLATE.test(surface.get(term) || term))
    .map(([term, c]) => [term, Math.min(c, 3) + (TECH_HINT.test(term.split(" ")[0]) || TECH_HINT.test(term) ? 1.5 : 0) + (term.includes(" ") ? 0.5 : 0)] as [string, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  return new Map(weighted);
}

function scoreText(terms: Map<string, number>, text: string) {
  const toks = tokens(text).filter((t) => !STOP.has(t)).map(stem);
  const set = new Set(toks);
  for (let i = 0; i < toks.length - 1; i++) set.add(`${toks[i]} ${toks[i + 1]}`);
  let hit = 0, total = 0;
  const matched: string[] = [], missing: string[] = [];
  for (const [term, w] of terms) { total += w; if (set.has(term)) { hit += w; matched.push(term); } else missing.push(term); }
  const coverage = total ? hit / total : 0;
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length >= 30);
  const focused = lines.filter((l) => { const s = new Set(tokens(l).map(stem)); return [...terms.keys()].some((t) => (t.includes(" ") ? l.toLowerCase().includes(t) : s.has(t))); }).length;
  const focus = lines.length ? focused / lines.length : 0;
  return { score: Math.round(100 * (0.65 * coverage + 0.35 * focus)), coverage, focus, matched, missing };
}

export function tailoredText(r: TailoredResume): string {
  return [
    ...r.roles.flatMap((role) => [`${role.company} ${role.title}`, ...role.groups.flatMap((g) => [g.heading, ...g.bullets])]),
    ...r.projects.flatMap((p) => [`${p.name} ${p.stack}`, ...p.bullets]),
    ...r.skills.map((s) => `${s.label}: ${s.items.join(", ")}`),
    ...(r.coursework ?? []), ...r.achievements
  ].join("\n");
}

export function profileText(p: Profile): string {
  return [
    ...p.roles.flatMap((role) => [`${role.company} ${role.title}`, ...role.bullets.map((b) => b.text)]),
    ...p.projects.flatMap((pr) => [`${pr.name} ${pr.stack}`, ...pr.bullets]),
    ...Object.entries(p.skills).map(([k, v]) => `${k}: ${v.join(", ")}`),
    ...p.coursework, ...p.achievements
  ].join("\n");
}

/** Score the tailored resume and the full profile against the same job, so the user sees the change. */
export function matchResume(jd: string, tailored: TailoredResume, profile: Profile, company?: string): Match {
  const terms = jobTerms(jd, 40, company ? [company] : []);
  const after = scoreText(terms, tailoredText(tailored));
  const before = scoreText(terms, profileText(profile));
  const shown = (list: string[]) => list.map((t) => surface.get(t) ?? t);
  return { tailored: after.score, profile: before.score, coverage: after.coverage, focus: after.focus, matched: shown(after.matched.slice(0, 12)), missing: shown(after.missing.slice(0, 8)) };
}
