import type { Profile } from "../profile/types";
import type { TailoredResume } from "./schema";

const clip = (s: string) => (s.length > 230 ? `${s.slice(0, 227).trimEnd()}...` : s);
const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/**
 * The master profile laid out as a resume with nothing selected or rewritten: the fallback when
 * tailoring cannot beat it. Groups a role's bullets by their first tag so the page still has structure.
 */
export function profileAsResume(profile: Profile): TailoredResume {
  const roles = profile.roles.slice(0, 2).map((r) => {
    const byTag = new Map<string, string[]>();
    for (const b of r.bullets) { const k = b.tags[0] || "Highlights"; byTag.set(k, [...(byTag.get(k) || []), clip(b.text)]); }
    const groups = [...byTag.entries()].flatMap(([heading, bullets]) => chunk(bullets, 4).map((bs) => ({ heading: heading.slice(0, 60), bullets: bs }))).slice(0, 4);
    return { company: r.company, title: r.title, start: r.start, end: r.end, groups: groups.length ? groups : [{ heading: "Highlights", bullets: r.bullets.slice(0, 4).map((b) => clip(b.text)) }] };
  });
  return {
    headline: profile.roles[0]?.title,
    roles,
    projects: profile.projects.slice(0, 2).map((p) => ({ name: p.name, stack: p.stack.slice(0, 70), year: p.year, bullets: p.bullets.slice(0, 2).map(clip) })),
    skills: Object.entries(profile.skills).slice(0, 7).map(([label, items]) => ({ label: label.slice(0, 40), items: items.slice(0, 12) })),
    coursework: profile.coursework.slice(0, 6),
    achievements: profile.achievements.slice(0, 2)
  };
}
