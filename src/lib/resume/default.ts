import type { Profile } from "../profile/types";
import type { TailoredResume } from "./schema";

const clip = (s: string) => (s.length > 230 ? `${s.slice(0, 227).trimEnd()}...` : s);

/** Tags are lowercase shorthand in the profile ("agents", "ai", "k8s"); headings need to read like a person wrote them. */
const ACRONYMS = new Set(["ai", "ml", "llm", "llms", "mcp", "api", "apis", "sql", "aws", "gcp", "ci", "cd", "ui", "ux", "rag", "nlp", "etl", "sdk", "cli", "k8s", "devops", "mlops", "saas", "b2b", "b2c", "qa", "sre", "cv", "genai"]);
const WORDS: Record<string, string> = { agents: "Agent Systems", agent: "Agent Systems", platform: "Platform and Reliability", infra: "Infrastructure", backend: "Backend Services", frontend: "Frontend", fullstack: "Full Stack", data: "Data", eval: "Evaluation and Observability", evals: "Evaluation and Observability", observability: "Evaluation and Observability", perf: "Performance", performance: "Performance", security: "Security", tooling: "Internal Tooling", devx: "Developer Experience", leadership: "Leadership", highlights: "Highlights" };
export function headingFor(tag: string): string {
  const key = tag.trim().toLowerCase();
  if (WORDS[key]) return WORDS[key];
  return key.split(/[-_\s]+/).map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(" ").slice(0, 60);
}

export function profileAsResume(profile: Profile): TailoredResume {
  const roles = profile.roles.slice(0, 2).map((r) => {
    // One group per tag, in the order the tags first appear; never two groups with the same heading.
    const byTag = new Map<string, string[]>();
    for (const b of r.bullets) { const k = headingFor(b.tags[0] || "highlights"); byTag.set(k, [...(byTag.get(k) || []), clip(b.text)]); }
    let groups = [...byTag.entries()].map(([heading, bullets]) => ({ heading, bullets }));
    // At most four groups: the smallest ones fold into "Other Highlights" rather than getting a repeated or padded heading.
    if (groups.length > 4) {
      groups.sort((a, b) => b.bullets.length - a.bullets.length);
      const keep = groups.slice(0, 3), rest = groups.slice(3);
      groups = [...keep, { heading: "Other Highlights", bullets: rest.flatMap((g) => g.bullets) }];
    }
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
