/**
 * Records the landing page's "How it works" clips (public/how/*.webm + poster PNGs) from the real app
 * in test mode, with the fictional John Doe applicant. Nothing is submitted anywhere.
 *
 *   npm run seed:test && npm run dev:test        (in one terminal)
 *   npx tsx scripts/record-how.mts <readyAppId>  (in another)
 *
 * The clips change test data (a new application, an approval); restore .data afterwards if you care.
 * Each clip is trimmed past the blank page load and encoded as a faststart H.264 MP4 plus a JPEG poster
 * of its first frame. That needs ffmpeg: on PATH, or FFMPEG=/path/to/ffmpeg (npx ffmpeg-static works).
 */
import { chromium, type Locator, type Page } from "playwright";
import { mkdirSync, renameSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";

const BASE = process.env.APP_URL || "http://localhost:3000";
const APP = process.argv[2];
const JOB_URL = process.argv[3] || "https://jobs.lever.co/binance/58cacd4c-78f1-423b-b6e4-9bab15e01ba1";
if (!APP) throw new Error("Pass the id of a ready test application.");
const OUT = "public/how";
mkdirSync(OUT, { recursive: true });
rmSync(`${OUT}/.tmp`, { recursive: true, force: true });
const SIZE = { width: 1280, height: 800 };

/** A visible cursor and click ripple, since screen recordings of a headless browser have none. */
const CURSOR = `
addEventListener("DOMContentLoaded", () => {
  // Next.js puts its dev badge and compile toasts in <nextjs-portal>; they are not part of the product.
  const hide = document.createElement("style"); hide.textContent = "nextjs-portal{display:none!important}"; document.head.appendChild(hide);
  const c = document.createElement("div");
  c.style.cssText = "position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:transform 40ms linear";
  c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l16 11-7 1.5L9.5 21z" fill="#121826" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.appendChild(c);
  addEventListener("mousemove", (e) => { c.style.transform = "translate(" + (e.clientX - 3) + "px," + (e.clientY - 2) + "px)"; }, true);
  addEventListener("mousedown", (e) => {
    const r = document.createElement("div");
    r.style.cssText = "position:fixed;z-index:2147483646;pointer-events:none;border-radius:50%;background:rgba(11,127,122,0.35);width:36px;height:36px;left:" + (e.clientX - 18) + "px;top:" + (e.clientY - 18) + "px;transition:transform .45s ease-out,opacity .45s ease-out";
    document.body.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = "scale(1.8)"; r.style.opacity = "0"; });
    setTimeout(() => r.remove(), 500);
  }, true);
});`;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function point(page: Page, el: Locator) {
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  if (!b) throw new Error("element not visible");
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 28 });
  await wait(250);
}
async function click(page: Page, el: Locator) { await point(page, el); await el.click(); }
async function type(page: Page, el: Locator, text: string, delay = 28) { await click(page, el); await el.pressSequentially(text, { delay }); }
async function scrollTo(page: Page, y: number) { await page.evaluate((top) => window.scrollTo({ top, behavior: "smooth" }), y); await wait(900); }
/** A title card between two moments of the same clip. */
async function card(page: Page, text: string, ms = 1300) {
  await page.evaluate((t) => {
    const d = document.createElement("div");
    d.id = "rec-card";
    d.style.cssText = "position:fixed;inset:0;z-index:2147483645;display:flex;align-items:center;justify-content:center;background:rgba(14,27,29,0.92);color:#f0eee6;font:500 28px Geist,system-ui;letter-spacing:-0.02em";
    d.textContent = t;
    document.body.appendChild(d);
  }, text);
  await wait(ms);
}

const FFMPEG = process.env.FFMPEG || "ffmpeg";

async function clip(name: string, run: (page: Page) => Promise<void>) {
  const browser = await chromium.launch();
  const started = Date.now();
  const ctx = await browser.newContext({ viewport: SIZE, recordVideo: { dir: `${OUT}/.tmp`, size: SIZE }, deviceScaleFactor: 1 });
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();
  // The recording starts with the context, before anything has painted: note when the first page is up and cut there.
  let lead = 0;
  page.once("load", () => { lead = (Date.now() - started) / 1000; });
  await run(page);
  const video = page.video();
  await ctx.close();
  await browser.close();
  const webm = `${OUT}/${name}.webm`;
  renameSync((await video!.path()), webm);
  const ss = (lead + 0.6).toFixed(2);
  try {
    execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-ss", ss, "-i", webm, "-c:v", "libx264", "-preset", "slow", "-crf", "25", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", `${OUT}/${name}.mp4`]);
    execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-ss", ss, "-i", webm, "-frames:v", "1", "-q:v", "3", `${OUT}/${name}.jpg`]);
    rmSync(webm);
    console.log("recorded", name, `(trimmed ${ss}s)`);
  } catch {
    console.warn(`recorded ${name}.webm; ffmpeg not found, so it is not trimmed or encoded. Set FFMPEG and run again.`);
  }
}

// Compile every route first, so no clip opens on a "Compiling" toast or half-loaded fonts.
for (const path of ["/dashboard", `/a/${APP}`, `/a/${APP}/edit`]) await fetch(BASE + path).catch(() => {});

// 1. Paste a link, watch it start, then the finished review page.
await clip("1-paste", async (page) => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.mouse.move(640, 400);
  await wait(600);
  await type(page, page.getByLabel("Job link"), JOB_URL, 14);
  await wait(300);
  await click(page, page.getByRole("button", { name: "Prepare application" }));
  await page.waitForURL(/\/a\//, { timeout: 30000 });
  await wait(4500);
  await card(page, "About a minute later");
  await page.goto(`${BASE}/a/${APP}`, { waitUntil: "networkidle" });
  await wait(1500);
  await point(page, page.getByText("Job match").first());
  await wait(1200);
  await scrollTo(page, 420);
  await wait(1500);
  await scrollTo(page, 0);
  await point(page, page.getByRole("link", { name: "Edit resume" }));
  await wait(1200);
});

// 2. Edit a line by hand, then ask the AI to rewrite another.
await clip("2-edit", async (page) => {
  await page.goto(`${BASE}/a/${APP}/edit`, { waitUntil: "networkidle" });
  await page.mouse.move(640, 300);
  await wait(1200);
  const bullets = page.getByLabel("Bullet");
  const first = bullets.first();
  await click(page, first);
  await first.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(el.value.length, el.value.length));
  await first.pressSequentially(" Model inference requests now run through it.", { delay: 35 });
  await wait(1200);
  await click(page, page.getByRole("button", { name: "AI rewrite" }).nth(1));
  await type(page, page.getByPlaceholder(/Optional: lead with the result/), "lead with the result", 40);
  await click(page, page.getByRole("button", { name: "Rewrite", exact: true }));
  await page.getByRole("button", { name: "Accept" }).waitFor({ timeout: 60000 });
  await wait(1800);
  await click(page, page.getByRole("button", { name: "Accept" }));
  await wait(1500);
  await point(page, page.getByText("Job match").first());
  await wait(1800);
});

// 3. Click through templates, then save the one you like.
await clip("3-templates", async (page) => {
  await page.goto(`${BASE}/a/${APP}/edit`, { waitUntil: "networkidle" });
  await page.mouse.move(640, 300);
  await wait(1000);
  for (const t of ["Standard", "Modern", "Developer", "Bold", "Harvard", "Modern"]) {
    await click(page, page.getByRole("radio", { name: t }));
    await wait(1500);
  }
  await click(page, page.getByRole("button", { name: "Save and render" }));
  await page.getByText(/^Saved\./).waitFor({ timeout: 60000 });
  await wait(2000);
});

// 4. Review the answers, approve; the runner fills and you submit.
await clip("4-approve", async (page) => {
  await page.goto(`${BASE}/a/${APP}`, { waitUntil: "networkidle" });
  await page.mouse.move(640, 300);
  await wait(1000);
  await point(page, page.getByRole("heading", { name: "Form answers" }));
  await wait(1200);
  const approve = page.getByRole("button", { name: "Approve for filling" });
  await point(page, approve);
  await wait(800);
  await approve.click();
  await wait(3000);
  await point(page, page.getByText("You press Submit"));
  await wait(2000);
});
