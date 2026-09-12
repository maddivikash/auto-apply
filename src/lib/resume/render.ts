/* eslint-disable @typescript-eslint/no-explicit-any -- Playwright browser type differs between playwright and playwright-core */
import { MASTER } from "../profile/master";
import type { Profile } from "../profile/types";
import type { TailoredResume } from "./schema";

const FONT_BASE = "https://cdn.jsdelivr.net/npm/computer-modern@0.1.3/fonts";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Escape, then turn **term** into <b>term</b>. */
const rich = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

const icon = {
  phone: `<svg viewBox="0 0 24 24" width="9" height="9"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8z"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" width="10" height="10"><path fill="currentColor" d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" width="10" height="10"><path fill="currentColor" d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.27V1.73C24 .77 23.2 0 22.22 0z"/></svg>`,
  github: `<svg viewBox="0 0 24 24" width="10" height="10"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z"/></svg>`
};

export function resumeHtml(r: TailoredResume, profile: Profile, scale = 1): string {
  const m = profile;
  const roles = r.roles.map((role) => `
    <div class="sub">
      <div class="row"><span class="b">${esc(role.company)}, ${esc(role.title)}</span><span class="b">${esc(role.start)} – ${esc(role.end)}</span></div>
      ${role.groups.map((g) => `
        ${role.groups.length > 1 || g.heading !== role.title ? `<div class="grp">${esc(g.heading)}</div>` : ""}
        <ul>${g.bullets.map((b) => `<li>${rich(b)}</li>`).join("")}</ul>`).join("")}
    </div>`).join("");

  const projects = r.projects.map((p) => `
    <div class="sub">
      <div class="row"><span><span class="b">${esc(p.name)}</span> <span class="sep">|</span> <i>${esc(p.stack)}</i></span><span class="b">${esc(p.year)}</span></div>
      <ul>${p.bullets.map((b) => `<li>${rich(b)}</li>`).join("")}</ul>
    </div>`).join("");

  const skills = r.skills.map((s) => `<div class="skill"><span class="b">${esc(s.label)}:</span> ${esc(s.items.join(", "))}</div>`).join("");
  const coursework = r.coursework?.length ? `
    <h2>Relevant Coursework</h2>
    <ul class="cols">${r.coursework.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : "";

  return `<!doctype html><html><head><meta charset="utf-8">
<style>
  /* The package's own CSS uses font-style: roman, which browsers reject, so declare the faces here. */
  @font-face { font-family: "CMU Serif"; font-style: normal; font-weight: 400; src: url("${FONT_BASE}/cmu-serif-500-roman.woff2") format("woff2"); }
  @font-face { font-family: "CMU Serif"; font-style: italic; font-weight: 400; src: url("${FONT_BASE}/cmu-serif-500-italic.woff2") format("woff2"); }
  @font-face { font-family: "CMU Serif"; font-style: normal; font-weight: 700; src: url("${FONT_BASE}/cmu-serif-700-roman.woff2") format("woff2"); }
  @font-face { font-family: "CMU Serif"; font-style: italic; font-weight: 700; src: url("${FONT_BASE}/cmu-serif-700-italic.woff2") format("woff2"); }
  @page { size: Letter; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { font-family: "CMU Serif", "Latin Modern Roman", "Times New Roman", Times, serif; font-size: ${(10.6 * scale).toFixed(2)}pt; color: #000; line-height: 1.22; }
  .page { width: 8.5in; min-height: 11in; box-sizing: border-box; padding: 0.32in 0.42in 0.3in 0.42in; }
  h1 { text-align: center; font-size: 24pt; font-weight: normal; font-variant: small-caps; letter-spacing: 0.5px; margin: 0 0 2pt; }
  .contact { text-align: center; font-size: 9.6pt; margin-bottom: 6pt; }
  .contact span { margin: 0 5pt; white-space: nowrap; }
  .contact svg { vertical-align: -1px; margin-right: 3px; }
  .contact a { color: #000; text-decoration: underline; }
  h2 { font-size: 12.5pt; font-weight: normal; font-variant: small-caps; margin: 7pt 0 2pt; padding-bottom: 1pt; border-bottom: 0.8pt solid #000; }
  .sub { margin: 2pt 0 0 0.02in; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; }
  .b { font-weight: bold; }
  .sep { margin: 0 2pt; }
  .grp { font-style: italic; margin: 2pt 0 0 0.02in; }
  ul { margin: 0.5pt 0 1.5pt 0.16in; padding-left: 0.1in; }
  li { font-size: ${(9.9 * scale).toFixed(2)}pt; margin: 0 0 0.6pt; padding-left: 0.02in; }
  li::marker { font-size: 9pt; }
  .skill { font-size: ${(9.9 * scale).toFixed(2)}pt; margin: 0 0 0.8pt 0.06in; }
  ul.cols { columns: 3; column-gap: 0.2in; margin-left: 0.32in; }
  ul.cols li { break-inside: avoid; }
  .ach { margin-left: 0.32in; }
</style></head><body><div class="page">
  <h1>${esc(m.name)}</h1>
  <div class="contact">
    ${m.phone ? `<span>${icon.phone}${esc(m.phone)}</span>` : ""}
    ${m.email ? `<span>${icon.mail}<a href="mailto:${m.email}">${esc(m.email)}</a></span>` : ""}
    ${m.linkedin ? `<span>${icon.linkedin}<a href="https://${m.linkedin.replace(/^https?:\/\//, "")}">${esc(m.linkedin.replace(/^https?:\/\/(www\.)?/, ""))}</a></span>` : ""}
    ${m.github ? `<span>${icon.github}<a href="https://${m.github.replace(/^https?:\/\//, "")}">${esc(m.github.replace(/^https?:\/\/(www\.)?/, ""))}</a></span>` : ""}
    ${m.website ? `<span><a href="https://${m.website.replace(/^https?:\/\//, "")}">${esc(m.website.replace(/^https?:\/\/(www\.)?/, ""))}</a></span>` : ""}
  </div>

  <h2>Education</h2>
  ${m.education.map((e) => `<div class="sub">
    <div class="row"><span class="b">${esc(e.school)}${e.place ? `, ${esc(e.place)}` : ""}</span><span class="b">${esc(e.dates)}</span></div>
    <div class="row"><i>${esc(e.degree)}</i><i>${esc(e.gpa)}</i></div>
  </div>`).join("")}

  <h2>Professional Experience</h2>
  ${roles}

  <h2>Projects</h2>
  ${projects}
  ${coursework}
  <h2>Technical Skills</h2>
  ${skills}

  <h2>Scholastic Achievements</h2>
  <ul class="ach">${r.achievements.map((a) => `<li>${rich(a)}</li>`).join("")}</ul>
</div></body></html>`;
}

export type RenderResult = {
  pdf: Buffer;
  heightPx: number;
  overflow: boolean;
  html: string;
  /** What fitToOnePage had to remove, in order. Empty when it fit as written. */
  trims: string[];
  resume: TailoredResume;
  scale: number;
};

const PAGE_PX = 1056; // 11in at 96dpi, which is what page.pdf uses

/**
 * Render with a local Chromium (Playwright). The Vercel runtime swaps in @sparticuz/chromium.
 * If the content runs past one page, apply the cheapest cuts first and re-measure until it fits.
 */
export async function renderPdf(input: TailoredResume, profile: Profile, launch?: () => Promise<any>): Promise<RenderResult> {
  const { chromium } = await import("playwright");
  const browser = launch ? await launch() : await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 816, height: PAGE_PX } });
    const measure = async (r: TailoredResume, scale: number) => {
      const html = resumeHtml(r, profile, scale);
      await page.setContent(html, { waitUntil: "networkidle" });
      await page.evaluate(() => (document as any).fonts?.ready);
      const h: number = await page.evaluate(() => {
        const el = document.querySelector(".page") as HTMLElement;
        el.style.minHeight = "0";
        return el.scrollHeight;
      });
      return { html, heightPx: h };
    };

    const r: TailoredResume = JSON.parse(JSON.stringify(input));
    let scale = 1;
    const trims: string[] = [];
    let { html, heightPx } = await measure(r, scale);

    const steps: Array<[string, (x: TailoredResume) => boolean]> = [
      ["drop coursework", (x) => { if (x.coursework?.length) { x.coursework = []; return true; } return false; }],
      ["font 97%", () => { if (scale > 0.97) { scale = 0.97; return true; } return false; }],
      ["limit skills to 6 groups", (x) => { if (x.skills.length > 6) { x.skills = x.skills.slice(0, 6); return true; } return false; }],
      ["one bullet per project", (x) => { let c = false; for (const p of x.projects) if (p.bullets.length > 1) { p.bullets = p.bullets.slice(0, 1); c = true; } return c; }],
      ["limit skills to 5 groups", (x) => { if (x.skills.length > 5) { x.skills = x.skills.slice(0, 5); return true; } return false; }],
      ["drop second project", (x) => { if (x.projects.length > 1) { x.projects = x.projects.slice(0, 1); return true; } return false; }],
      ["font 94%", () => { if (scale > 0.94) { scale = 0.94; return true; } return false; }],
      ["trim longest group to 2 bullets", (x) => {
        const groups = x.roles[0].groups.filter((g) => g.bullets.length > 2);
        if (!groups.length) return false;
        groups.sort((a, b) => b.bullets.join("").length - a.bullets.join("").length)[0].bullets.pop();
        return true;
      }],
      ["drop last VMock group", (x) => { if (x.roles[0].groups.length > 3) { x.roles[0].groups.pop(); return true; } return false; }],
      ["font 91%", () => { if (scale > 0.91) { scale = 0.91; return true; } return false; }]
    ];

    let guard = 0;
    while (heightPx > PAGE_PX && guard++ < 20) {
      let applied = false;
      for (const [name, step] of steps) {
        if (step(r)) { trims.push(name); applied = true; break; }
      }
      if (!applied) break;
      ({ html, heightPx } = await measure(r, scale));
      // Once a step is used it should not be tried again unless it can still change something,
      // so steps are written to return false when already applied.
    }

    const pdf = await page.pdf({ format: "Letter", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true });
    return { pdf: Buffer.from(pdf), heightPx, overflow: heightPx > PAGE_PX, html, trims, resume: r, scale };
  } finally {
    await browser.close();
  }
}

/** The master profile rendered as-is, used to check layout without an LLM. */
export function masterAsTailored(): TailoredResume {
  const [vmock, karomi] = MASTER.roles;
  const pick = (ids: string[]) => ids.map((id) => vmock.bullets.find((b) => b.id === id)!.text);
  return {
    roles: [
      { company: vmock.company, title: vmock.title, start: vmock.start, end: vmock.end, groups: [
        { heading: "Agentic AI Workloads in Production", bullets: pick(["agent-prod", "mcp-server", "tool-framework"]) },
        { heading: "LLM Observability, Evaluation and Cost Control", bullets: pick(["observability", "cost-tracking", "evals-gate"]) },
        { heading: "Platform, Deployment and Reliability", bullets: pick(["k8s-ops", "internal-tooling", "migration"]) },
        { heading: "Python, Data and Retrieval", bullets: pick(["latency", "rag"]) }
      ] },
      { company: karomi.company, title: karomi.title, start: karomi.start, end: karomi.end, groups: [
        { heading: karomi.title, bullets: [karomi.bullets[0].text] }
      ] }
    ],
    projects: [{ name: MASTER.projects[0].name, stack: MASTER.projects[0].stack, year: MASTER.projects[0].year, bullets: [MASTER.projects[0].bullets[1]] }],
    skills: Object.entries(MASTER.skills).slice(0, 6).map(([label, items]) => ({ label, items })),
    achievements: MASTER.achievements
  };
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
