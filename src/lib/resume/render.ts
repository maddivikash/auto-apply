/* eslint-disable @typescript-eslint/no-explicit-any -- Playwright browser type differs between playwright and playwright-core */
import { launchBrowser } from "../browser";
import { MASTER } from "../profile/master";
import type { Profile } from "../profile/types";
import type { TailoredResume } from "./schema";
import { DEFAULT_TEMPLATE, resumeHtml, type TemplateId } from "./templates";

export { resumeHtml, profileAsTailored } from "./templates";

export type RenderResult = {
  pdf: Buffer;
  heightPx: number;
  overflow: boolean;
  /** True when the page stayed noticeably short even after the type was enlarged. */
  sparse: boolean;
  html: string;
  /** What fitToOnePage had to remove, in order. Empty when it fit as written. */
  trims: string[];
  resume: TailoredResume;
  scale: number;
};

const PAGE_PX = 1056; // 11in at 96dpi, which is what page.pdf uses
const FULL = 0.965; // a page at least this full is considered filled
const SPARSE = 0.88; // below this even after growing the type, suggest adding content
// Type and spacing scale steps tried on a short page. Dense layouts (Compact) need the upper steps to fill the sheet.
const GROW = [1.03, 1.06, 1.09, 1.12, 1.14, 1.16, 1.18, 1.2, 1.22, 1.24, 1.27, 1.3, 1.35, 1.4];

/**
 * Render with Chromium via launchBrowser (local Playwright install, or @sparticuz/chromium on Vercel).
 * If the content runs past one page, apply the cheapest cuts first and re-measure until it fits.
 */
export async function renderPdf(input: TailoredResume, profile: Profile, launch: () => Promise<any> = launchBrowser, template: TemplateId = DEFAULT_TEMPLATE): Promise<RenderResult> {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 816, height: PAGE_PX } });
    const measure = async (r: TailoredResume, scale: number) => {
      const html = resumeHtml(r, profile, scale, template);
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

    // Short page: grow the type and spacing until the page is full, never past one page.
    // Content is never a reason to stop; a sparse profile just renders larger and gets a suggestion.
    if (trims.length === 0 && heightPx < PAGE_PX * FULL) {
      for (const s of GROW) {
        const m = await measure(r, s);
        if (m.heightPx > PAGE_PX) break;
        scale = s; html = m.html; heightPx = m.heightPx;
        if (heightPx >= PAGE_PX * FULL) break;
      }
      ({ html, heightPx } = await measure(r, scale)); // the page holds the last measured HTML; put the winner back
    }
    const sparse = heightPx < PAGE_PX * SPARSE;

    const pdf = await page.pdf({ format: "Letter", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true });
    return { pdf: Buffer.from(pdf), heightPx, overflow: heightPx > PAGE_PX, sparse, html, trims, resume: r, scale };
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
