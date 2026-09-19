import type { Profile, Project, Role } from "./types";

/** Lowercase, strip punctuation and spaces, so "Built X." and "built x" count as the same fact. */
const key = (s: string) => s.toLowerCase().replace(/\*\*/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const same = (a: string, b: string) => key(a) === key(b);

function mergeRole(base: Role, add: Role): Role {
  const bullets = [...base.bullets];
  for (const b of add.bullets) if (!bullets.some((x) => same(x.text, b.text))) bullets.push({ ...b, id: bullets.some((x) => x.id === b.id) ? `${b.id}-${bullets.length}` : b.id });
  return { ...base, location: base.location || add.location, bullets };
}

function mergeProject(base: Project, add: Project): Project {
  const bullets = [...base.bullets];
  for (const b of add.bullets) if (!bullets.some((x) => same(x, b))) bullets.push(b);
  const tags = Array.from(new Set([...base.tags, ...add.tags]));
  return { ...base, stack: base.stack || add.stack, year: base.year || add.year, tags, bullets };
}

/**
 * Union of two profiles: every fact from both, nothing twice. Roles match on company + title,
 * projects on name, education on school, skills on group label. Contact fields keep the base
 * unless empty. Pure, so it can be tested without a model.
 */
export function mergeProfiles(base: Profile, add: Profile): Profile {
  const roles = [...base.roles];
  for (const r of add.roles) {
    const i = roles.findIndex((x) => same(x.company, r.company) && same(x.title, r.title));
    if (i >= 0) roles[i] = mergeRole(roles[i], r); else roles.push(r);
  }
  const projects = [...base.projects];
  for (const p of add.projects) {
    const i = projects.findIndex((x) => same(x.name, p.name));
    if (i >= 0) projects[i] = mergeProject(projects[i], p); else projects.push(p);
  }
  const education = [...base.education];
  for (const e of add.education) if (!education.some((x) => same(x.school, e.school) && same(x.degree, e.degree))) education.push(e);
  const skills: Record<string, string[]> = { ...base.skills };
  for (const [label, items] of Object.entries(add.skills)) {
    const existing = Object.keys(skills).find((k) => same(k, label));
    const target = existing ?? label;
    const cur = skills[target] ?? [];
    skills[target] = [...cur, ...items.filter((it) => !cur.some((c) => same(c, it)))];
  }
  const union = (a: string[], b: string[]) => [...a, ...b.filter((x) => !a.some((y) => same(x, y)))];
  const pick = (a: string, b: string) => a || b;
  return {
    name: pick(base.name, add.name), phone: pick(base.phone, add.phone), email: pick(base.email, add.email), linkedin: pick(base.linkedin, add.linkedin),
    github: pick(base.github, add.github), website: pick(base.website, add.website), location: pick(base.location, add.location), gender: pick(base.gender, add.gender),
    education, roles, projects, skills, coursework: union(base.coursework, add.coursework), achievements: union(base.achievements, add.achievements)
  };
}
