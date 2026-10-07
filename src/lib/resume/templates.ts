/**
 * Resume templates. Pure functions with no browser or server imports, so the same HTML drives the
 * PDF (render.ts, in Chromium) and the live previews in the app (an iframe srcdoc).
 *
 * Every template is single column, real text and standard headings, so applicant tracking systems
 * read each line in order. They differ in type, header, section headings and density only.
 * The page must keep the `.page` wrapper: renderPdf measures it to fit the resume on one page.
 */
import type { Profile } from "../profile/types";
import type { TailoredResume } from "./schema";

export const TEMPLATE_IDS = ["classic", "standard", "modern", "compact", "harvard", "developer", "bold"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];
export const DEFAULT_TEMPLATE: TemplateId = "classic";

export type TemplateInfo = {
  id: TemplateId;
  name: string;
  /** One line for the gallery. */
  blurb: string;
  /** S: textbook ATS layout. A: one small departure (an accent colour, a different header) that still parses cleanly. */
  tier: "S" | "A";
  font: string;
};

export const TEMPLATES: TemplateInfo[] = [
  { id: "classic", name: "Classic", tier: "S", font: "Computer Modern", blurb: "The LaTeX look engineers recognise: small caps, ruled headings, icons in the contact line." },
  { id: "standard", name: "Standard", tier: "S", font: "Source Serif", blurb: "A quiet serif with uppercase headings. Reads well for any role, any reviewer." },
  { id: "compact", name: "Compact", tier: "S", font: "Inter", blurb: "Tighter type and margins, for a long history that still has to fit one page." },
  { id: "harvard", name: "Harvard", tier: "S", font: "Tinos (Times)", blurb: "The careers-office classic: Times, centred name, bold headings, no colour." },
  { id: "modern", name: "Modern", tier: "A", font: "Inter", blurb: "Clean sans with a royal-blue name and headings. Still one column, still plain text." },
  { id: "developer", name: "Developer", tier: "A", font: "IBM Plex Sans + Mono", blurb: "Monospace headings and a teal accent, made for engineering roles." },
  { id: "bold", name: "Bold", tier: "A", font: "Inter", blurb: "A navy bar across the top and heavy headings, for a confident first glance." }
];

export const isTemplateId = (v: unknown): v is TemplateId => typeof v === "string" && (TEMPLATE_IDS as readonly string[]).includes(v);
export const templateInfo = (id: string | undefined): TemplateInfo => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

const FONT_BASE = "https://cdn.jsdelivr.net/npm/computer-modern@0.1.3/fonts";
const GOOGLE = (families: string) => `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families}&display=block">`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Escape, then turn **term** into <b>term</b>. */
const rich = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const bare = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "");
const href = (u: string) => `https://${u.replace(/^https?:\/\//, "")}`;

const icon = {
  phone: `<svg viewBox="0 0 24 24" width="9" height="9"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8z"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" width="10" height="10"><path fill="currentColor" d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" width="10" height="10"><path fill="currentColor" d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.27V1.73C24 .77 23.2 0 22.22 0z"/></svg>`,
  github: `<svg viewBox="0 0 24 24" width="10" height="10"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z"/></svg>`
};

/** What changes between templates. Everything else (the markup, the section order) is shared. */
type Look = {
  head: string;
  /** Base type size in pt, before the fit-to-page scale. Bullets use `li`. */
  body: number;
  li: number;
  leading: number;
  padding: string;
  icons: boolean;
  /** "inline": "Company, Title" on one line. "stacked": title on one line, company under it. */
  role: "inline" | "stacked";
  css: string;
};

const LOOKS: Record<TemplateId, Look> = {
  classic: {
    head: `<style>
  @font-face { font-family: "CMU Serif"; font-style: normal; font-weight: 400; src: url("${FONT_BASE}/cmu-serif-500-roman.woff2") format("woff2"); }
  @font-face { font-family: "CMU Serif"; font-style: italic; font-weight: 400; src: url("${FONT_BASE}/cmu-serif-500-italic.woff2") format("woff2"); }
  @font-face { font-family: "CMU Serif"; font-style: normal; font-weight: 700; src: url("${FONT_BASE}/cmu-serif-700-roman.woff2") format("woff2"); }
  @font-face { font-family: "CMU Serif"; font-style: italic; font-weight: 700; src: url("${FONT_BASE}/cmu-serif-700-italic.woff2") format("woff2"); }
</style>`,
    body: 10.6, li: 9.9, leading: 1.22, padding: "0.32in 0.42in 0.3in 0.42in", icons: true, role: "inline",
    css: `
  body { font-family: "CMU Serif", "Latin Modern Roman", "Times New Roman", Times, serif; }
  h1 { text-align: center; font-size: 24pt; font-weight: normal; font-variant: small-caps; letter-spacing: 0.5px; margin: 0 0 2pt; }
  .contact { text-align: center; font-size: 9.6pt; margin-bottom: 6pt; }
  h2 { font-size: 12.5pt; font-weight: normal; font-variant: small-caps; padding-bottom: 1pt; border-bottom: 0.8pt solid #000; }`
  },
  standard: {
    head: GOOGLE("family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400"),
    body: 10.2, li: 9.6, leading: 1.28, padding: "0.4in 0.5in 0.36in 0.5in", icons: false, role: "stacked",
    css: `
  body { font-family: "Source Serif 4", Georgia, "Times New Roman", serif; color: #111; }
  h1 { text-align: center; font-size: 21pt; font-weight: 600; margin: 0 0 3pt; letter-spacing: 0.2px; }
  .contact { text-align: center; font-size: 9.2pt; color: #333; margin-bottom: 6pt; }
  h2 { font-size: 10.4pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.9px; padding-bottom: 1.5pt; border-bottom: 0.9pt solid #111; }
  .co { font-style: italic; color: #333; }`
  },
  modern: {
    head: GOOGLE("family=Inter:wght@400;500;600;700"),
    body: 9.8, li: 9.3, leading: 1.32, padding: "0.42in 0.5in 0.36in 0.5in", icons: false, role: "stacked",
    css: `
  body { font-family: Inter, "Helvetica Neue", Arial, sans-serif; color: #1b2430; }
  h1 { font-size: 22pt; font-weight: 700; color: #2b4fd8; letter-spacing: -0.4px; margin: 0 0 3pt; }
  .contact { font-size: 9pt; color: #4a5565; margin-bottom: 8pt; }
  .contact span:first-child { margin-left: 0; }
  h2 { font-size: 9.6pt; font-weight: 700; color: #2b4fd8; text-transform: uppercase; letter-spacing: 1.2px; padding-bottom: 2pt; border-bottom: 0.8pt solid #c9d3f5; }
  .b { font-weight: 600; }
  .co { color: #4a5565; }
  .grp { font-style: normal; font-weight: 500; color: #2b4fd8; }`
  },
  compact: {
    head: GOOGLE("family=Inter:wght@400;500;600;700"),
    body: 9.2, li: 8.8, leading: 1.25, padding: "0.3in 0.38in 0.26in 0.38in", icons: false, role: "inline",
    css: `
  body { font-family: Inter, "Helvetica Neue", Arial, sans-serif; color: #111; }
  h1 { text-align: center; font-size: 17pt; font-weight: 700; margin: 0 0 2pt; letter-spacing: -0.2px; }
  .contact { text-align: center; font-size: 8.6pt; color: #333; margin-bottom: 4pt; }
  h2 { font-size: 9.2pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 1.5pt 3pt; background: #eef0f3; border: 0; }
  .b { font-weight: 600; }`
  },
  harvard: {
    head: GOOGLE("family=Tinos:ital,wght@0,400;0,700;1,400;1,700"),
    body: 10.8, li: 10.1, leading: 1.2, padding: "0.4in 0.5in 0.35in 0.5in", icons: false, role: "stacked",
    css: `
  body { font-family: Tinos, "Times New Roman", Times, serif; color: #000; }
  h1 { text-align: center; font-size: 18pt; font-weight: 700; margin: 0 0 2pt; }
  .contact { text-align: center; font-size: 10pt; margin-bottom: 6pt; }
  h2 { text-align: center; font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; border: 0; padding: 0; }
  .co { font-style: italic; }`
  },
  developer: {
    head: GOOGLE("family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@500;600"),
    body: 9.8, li: 9.3, leading: 1.3, padding: "0.38in 0.48in 0.34in 0.48in", icons: true, role: "inline",
    css: `
  body { font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif; color: #15191e; }
  h1 { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 20pt; font-weight: 600; letter-spacing: -0.6px; margin: 0 0 3pt; }
  .contact { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 8.4pt; color: #3b4450; margin-bottom: 8pt; }
  .contact span:first-child { margin-left: 0; }
  .contact svg { color: #0f8a8a; }
  h2 { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 9.6pt; font-weight: 600; color: #0f8a8a; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 0.8pt dashed #9cc9c9; padding-bottom: 1.5pt; }
  .b { font-weight: 600; }
  .grp { font-style: normal; font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 8.6pt; color: #0f8a8a; }
  li b { font-weight: 600; }`
  },
  bold: {
    head: GOOGLE("family=Inter:wght@400;500;600;700;800"),
    body: 9.8, li: 9.3, leading: 1.3, padding: "0 0.5in 0.36in 0.5in", icons: false, role: "stacked",
    css: `
  body { font-family: Inter, "Helvetica Neue", Arial, sans-serif; color: #101828; }
  .page { border-top: 0.16in solid #0b1f3d; padding-top: 0.28in !important; }
  h1 { font-size: 24pt; font-weight: 800; letter-spacing: -0.6px; color: #0b1f3d; margin: 0 0 3pt; }
  .contact { font-size: 9pt; color: #475467; margin-bottom: 8pt; }
  .contact span:first-child { margin-left: 0; }
  h2 { font-size: 11pt; font-weight: 800; color: #0b1f3d; text-transform: uppercase; letter-spacing: 0.4px; padding-bottom: 2pt; border-bottom: 2pt solid #0b1f3d; }
  .b { font-weight: 700; }
  .co { color: #475467; font-weight: 500; }`
  }
};

export function resumeHtml(r: TailoredResume, profile: Profile, scale = 1, template: TemplateId = DEFAULT_TEMPLATE): string {
  const m = profile;
  const look = LOOKS[template] ?? LOOKS[DEFAULT_TEMPLATE];
  const pt = (n: number) => `${(n * scale).toFixed(2)}pt`;

  const roleHead = (role: TailoredResume["roles"][number]) => look.role === "inline"
    ? `<div class="row"><span class="b">${esc(role.company)}, ${esc(role.title)}</span><span class="b">${esc(role.start)} – ${esc(role.end)}</span></div>`
    : `<div class="row"><span class="b">${esc(role.title)}</span><span class="b">${esc(role.start)} – ${esc(role.end)}</span></div><div class="co">${esc(role.company)}</div>`;
  const roles = r.roles.map((role) => `
    <div class="sub">
      ${roleHead(role)}
      ${role.groups.map((g) => `
        ${role.groups.length > 1 || g.heading !== role.title ? `<div class="grp">${esc(g.heading)}</div>` : ""}
        <ul>${g.bullets.map((b) => `<li>${rich(b)}</li>`).join("")}</ul>`).join("")}
    </div>`).join("");

  const projects = r.projects.map((p) => `
    <div class="sub">
      <div class="row"><span><span class="b">${esc(p.name)}</span>${p.stack ? ` <span class="sep">|</span> <i>${esc(p.stack)}</i>` : ""}</span><span class="b">${esc(p.year)}</span></div>
      <ul>${p.bullets.map((b) => `<li>${rich(b)}</li>`).join("")}</ul>
    </div>`).join("");

  const skills = r.skills.map((s) => `<div class="skill"><span class="b">${esc(s.label)}:</span> ${esc(s.items.join(", "))}</div>`).join("");
  const coursework = r.coursework?.length ? `
    <h2>Relevant Coursework</h2>
    <ul class="cols">${r.coursework.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : "";

  const contact = [
    m.phone && `<span>${look.icons ? icon.phone : ""}${esc(m.phone)}</span>`,
    m.email && `<span>${look.icons ? icon.mail : ""}<a href="mailto:${esc(m.email)}">${esc(m.email)}</a></span>`,
    m.linkedin && `<span>${look.icons ? icon.linkedin : ""}<a href="${esc(href(m.linkedin))}">${esc(bare(m.linkedin))}</a></span>`,
    m.github && `<span>${look.icons ? icon.github : ""}<a href="${esc(href(m.github))}">${esc(bare(m.github))}</a></span>`,
    m.website && `<span><a href="${esc(href(m.website))}">${esc(bare(m.website))}</a></span>`
  ].filter(Boolean).join(look.icons ? " " : ` <i class="dot">·</i> `); // spaces give the line somewhere to wrap

  return `<!doctype html><html><head><meta charset="utf-8">${look.head}
<style>
  @page { size: Letter; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-size: ${pt(look.body)}; color: #000; line-height: ${look.leading}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 8.5in; min-height: 11in; box-sizing: border-box; padding: ${look.padding}; }
  .contact span { margin: 0 5pt; white-space: nowrap; }
  .contact .dot { font-style: normal; opacity: 0.6; }
  .contact svg { vertical-align: -1px; margin-right: 3px; }
  .contact a { color: inherit; text-decoration: underline; text-decoration-thickness: 0.5pt; text-underline-offset: 1.5pt; }
  h2 { margin: ${pt(7)} 0 ${pt(2.5)}; }
  .sub { margin: 2pt 0 0 0.02in; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; }
  .b { font-weight: bold; }
  .sep { margin: 0 2pt; }
  .grp { font-style: italic; margin: 2pt 0 0 0.02in; }
  ul { margin: 0.5pt 0 1.5pt 0.16in; padding-left: 0.1in; }
  li { font-size: ${pt(look.li)}; margin: 0 0 ${pt(0.6)}; padding-left: 0.02in; }
  li::marker { font-size: 0.9em; }
  .skill { font-size: ${pt(look.li)}; margin: 0 0 ${pt(0.8)} 0.06in; }
  ul.cols { columns: 3; column-gap: 0.2in; margin-left: 0.32in; }
  ul.cols li { break-inside: avoid; }
  .ach { margin-left: 0.32in; }
  ${look.css}
</style></head><body><div class="page">
  <h1>${esc(m.name)}</h1>
  <div class="contact">${contact}</div>

  <h2>Education</h2>
  ${m.education.map((e) => `<div class="sub">
    <div class="row"><span class="b">${esc(e.school)}${e.place ? `, ${esc(e.place)}` : ""}</span><span class="b">${esc(e.dates)}</span></div>
    <div class="row"><i>${esc(e.degree)}</i><i>${esc(e.gpa)}</i></div>
  </div>`).join("")}

  <h2>Professional Experience</h2>
  ${roles}

  ${r.projects.length ? `<h2>Projects</h2>
  ${projects}` : ""}
  ${coursework}
  ${r.skills.length ? `<h2>Technical Skills</h2>
  ${skills}` : ""}
  ${r.achievements.length ? `<h2>Scholastic Achievements</h2>
  <ul class="ach">${r.achievements.map((a) => `<li>${rich(a)}</li>`).join("")}</ul>` : ""}
</div></body></html>`;
}

/** Group the profile as-is, used for previews before any tailoring. */
export function profileAsTailored(p: Profile): TailoredResume {
  return {
    roles: p.roles.map((r, i) => ({ company: r.company, title: r.title, start: r.start, end: r.end, groups: [{ heading: r.title, bullets: r.bullets.slice(0, i === 0 ? 6 : 2).map((b) => b.text) }] })),
    projects: p.projects.slice(0, 2).map((x) => ({ name: x.name, stack: x.stack, year: x.year, bullets: x.bullets.slice(0, 1) })),
    skills: Object.entries(p.skills).slice(0, 6).map(([label, items]) => ({ label, items })),
    achievements: p.achievements.slice(0, 2)
  };
}
