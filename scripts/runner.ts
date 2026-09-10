/**
 * Local runner. Polls the web app for approved applications, fills the form in a
 * visible Chromium window, screenshots it, and reports "filled". It keeps that
 * tab open and submits only when the app says submit_requested.
 *
 *   APP_URL=https://auto-apply-vikash.vercel.app RUNNER_TOKEN=... npx tsx scripts/runner.ts
 */
import { chromium, type Browser, type Page } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { answerFor } from "../src/lib/defaults";
import { discoverLiveFields } from "../src/lib/apply/discover";
import type { Application, QuestionState } from "../src/lib/store";
import type { Settings } from "../src/lib/profile/types";

let SETTINGS: Settings;

const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const TOKEN = process.env.RUNNER_TOKEN;
if (!TOKEN) throw new Error("RUNNER_TOKEN is required");
const POLL_MS = Number(process.env.RUNNER_POLL_MS || 8000);
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

const api = async (path: string, init?: RequestInit) => {
  const r = await fetch(`${APP_URL}/api/runner${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${await r.text()}`);
  return r.json();
};
const report = (id: string, body: Record<string, unknown>) => api(`/${id}`, { method: "POST", body: JSON.stringify(body) });

type Live = { page: Page; app: Application; filledAt: number };
const live = new Map<string, Live>();
const inFlight = new Set<string>();
let browser: Browser | null = null;

// One runner per machine. A second instance would fill the same form twice.
import { existsSync, readFileSync as readSync, unlinkSync } from "node:fs";
const LOCK = join(tmpdir(), "auto-apply-runner.lock");
if (existsSync(LOCK)) {
  const pid = Number(readSync(LOCK, "utf8"));
  let alive = false; try { process.kill(pid, 0); alive = true; } catch {}
  if (alive) { console.error(`Another runner is already running (pid ${pid}). Exiting.`); process.exit(1); }
}
writeFileSync(LOCK, String(process.pid));
process.on("exit", () => { try { unlinkSync(LOCK); } catch {} });
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  browser = await chromium.launch({ headless: false, args: ["--window-size=1400,1000"] });
  return browser;
}

async function downloadResume(app: Application): Promise<string> {
  const dir = join(tmpdir(), "auto-apply"); mkdirSync(dir, { recursive: true });
  const p = join(dir, `Resume_${app.job!.company}.pdf`);
  const r = await fetch(`${APP_URL}/api/applications/${app.id}/pdf`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  writeFileSync(p, Buffer.from(await r.arrayBuffer()));
  return p;
}

const answerOf = (app: Application, q: QuestionState) => q.answer || answerFor(SETTINGS, q.label, q.options, q.type, { jobLocation: app.job?.location })?.value;

// ---- Greenhouse ----------------------------------------------------------

async function fillGreenhouse(page: Page, app: Application, notes: string[]) {
  await page.locator("#first_name").waitFor({ state: "visible", timeout: 60000 });
  const type = async (sel: string, value: string) => { const el = page.locator(sel).first(); if (!(await el.count())) return false; await el.scrollIntoViewIfNeeded(); await el.click(); await el.fill(""); await el.pressSequentially(value, { delay: 15 }); return true; };
  const pickOption = async (sel: string, typed: string, re: RegExp) => {
    const el = page.locator(sel).first(); if (!(await el.count())) return false;
    await el.scrollIntoViewIfNeeded(); await el.click(); await page.waitForTimeout(250);
    if (typed) await el.pressSequentially(typed, { delay: 30 });
    await page.waitForTimeout(900);
    const opts = page.getByRole("option"); const texts = await opts.allInnerTexts();
    const i = texts.findIndex((t) => re.test(t.replace(/\s+/g, " ").trim()));
    if (i < 0) { await page.keyboard.press("Escape"); return false; }
    await opts.nth(i).click(); await page.waitForTimeout(300); return true;
  };

  await type("#first_name", SETTINGS.firstName);
  await type("#last_name", SETTINGS.lastName);
  await type("#email", SETTINGS.email);
  const phoneDigits = SETTINGS.phone.replace(/[^\d+]/g, "");
  if (await page.locator("#country").count() && SETTINGS.phoneCountry) { (await pickOption("#country", SETTINGS.phoneCountry, new RegExp(`^${SETTINGS.phoneCountry}\\b`, "i"))) || notes.push("Could not pick phone country"); }
  await type("#phone", phoneDigits.replace(/^\+\d{1,3}/, ""));
  if (await page.locator("#candidate-location").count() && SETTINGS.location) {
    const city = SETTINGS.location.split(",")[0].trim();
    await type("#candidate-location", city);
    await page.waitForTimeout(1800);
    const opts = page.getByRole("option"); const texts = await opts.allInnerTexts();
    const i = texts.findIndex((t) => t.toLowerCase().includes(city.toLowerCase()));
    if (i >= 0) await opts.nth(i).click(); else notes.push(`Location autocomplete had no match for ${city}`);
  }
  const resumePath = await downloadResume(app);
  await page.locator("input#resume").setInputFiles(resumePath);
  await page.waitForTimeout(2500);
  notes.push("Resume attached");

  for (const q of app.questions) {
    if (q.type === "file") continue;
    // Location and its hidden geo fields were handled by the autocomplete above.
    if (/^(location|longitude|latitude)$/i.test(q.id) || /^location( \(city\))?$/i.test(q.label)) continue;
    const value = answerOf(app, q);
    const baseId = q.id.replace(/\[\]$/, "");
    const sel = `#${baseId.replace(/[^\w-]/g, (c) => `\\${c}`)}`;
    if (!value) { if (q.required) notes.push(`No answer for required: ${q.label}`); continue; }
    if (q.options?.length) {
      const ok = await pickOption(sel, "", new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));
      if (!ok) {
        // Checkbox groups (privacy acknowledgement) render as inputs named question_X[]
        const cb = page.locator(`input[name="${baseId}[]"]`).first();
        if (await cb.count()) { if (!(await cb.isChecked())) await cb.click({ force: true }); }
        else notes.push(`Could not select "${value}" for ${q.label}`);
      }
    } else {
      (await type(sel, value)) || notes.push(`Field not found: ${q.label}`);
    }
  }
}

async function submitGreenhouse(page: Page) {
  await page.getByRole("button", { name: /submit application/i }).click();
  await page.waitForTimeout(4000);
  const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  if (/thank you|application (has been )?submitted|we have received/i.test(text)) return true;
  if (/captcha|verify you are human/i.test(text)) throw new Error("reCAPTCHA challenge shown; complete it in the window and press Submit there.");
  const errors = await page.locator(".field-error, [role=alert], .error").allInnerTexts();
  throw new Error(`No confirmation after submit. ${errors.filter(Boolean).slice(0, 3).join(" | ")}`);
}

// ---- Lever / Ashby: generic label-driven fill ------------------------------

async function discoverAndFillGeneric(page: Page, app: Application, notes: string[]) {
  await page.waitForLoadState("networkidle");
  const resumePath = await downloadResume(app);
  const fileInput = page.locator('input[type=file]').first();
  if (await fileInput.count()) { await fileInput.setInputFiles(resumePath); notes.push("Resume attached"); await page.waitForTimeout(3000); }

  const fields = await discoverLiveFields(page);

  const unanswered: { label: string; required: boolean; type: string; options?: string[] }[] = [];
  for (const f of fields) {
    if (!f.label || f.type === "file") continue;
    const stored = app.questions.find((q) => q.label.toLowerCase() === f.label.toLowerCase());
    const kind = f.type === "group" ? "select" : f.type;
    const value = stored?.answer || answerFor(SETTINGS, f.label, f.options, kind, { jobLocation: app.job?.location })?.value;
    if (!value) {
      // A lone checkbox with no rule is left alone (marketing consent), unless it is phrased as a question.
      if (f.type !== "checkbox" || /\?/.test(f.label)) unanswered.push({ label: f.label, required: f.required, type: kind, options: f.options });
      continue;
    }
    try {
      if (f.type === "select") await page.locator(f.selector).first().selectOption({ label: value });
      else if (f.type === "checkbox") { const el = page.locator(f.selector).first(); if (!(await el.isChecked())) await el.check({ force: true }); }
      else if (f.type === "group") {
        // Click the option whose label matches the chosen value.
        const inputs = page.locator(f.selector);
        const n = await inputs.count();
        let hit = false;
        for (let i = 0; i < n && !hit; i++) {
          const el = inputs.nth(i);
          const id = await el.getAttribute("id");
          const text = ((id && (await page.locator(`label[for="${id}"]`).first().textContent().catch(() => ""))) || (await el.locator("xpath=ancestor::label[1]").first().textContent().catch(() => "")) || "").replace(/\s+/g, " ").trim();
          if (text.toLowerCase() === value.toLowerCase()) { await el.scrollIntoViewIfNeeded(); await el.check({ force: true }); hit = true; }
        }
        if (!hit) notes.push(`Could not pick "${value}" for ${f.label}`);
      }
      else { const el = page.locator(f.selector).first(); await el.scrollIntoViewIfNeeded(); await el.fill(""); await el.pressSequentially(value, { delay: 12 }); }
    } catch (e) { notes.push(`Could not fill "${f.label}": ${(e as Error).message.slice(0, 80)}`); }
  }
  if (unanswered.length) {
    notes.push(`${unanswered.length} field(s) need your answer: ${unanswered.map((u) => u.label).join("; ")}`);
    await report(app.id, { questions: unanswered });
  }
}

async function submitGeneric(page: Page) {
  const btn = page.getByRole("button", { name: /submit( application)?|apply/i }).last();
  await btn.click();
  await page.waitForTimeout(5000);
  const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  if (/thank|submitted|received|success/i.test(text)) return true;
  if (/captcha|robot/i.test(text)) throw new Error("Captcha shown; complete it in the window and press Submit there.");
  throw new Error("No confirmation text after submit");
}

// ---- Orchestration ----------------------------------------------------------

async function fill(app: Application) {
  const notes: string[] = [];
  await report(app.id, { status: "filling", notes: ["Runner picked up the application"] });
  const b = await getBrowser();
  const page = await b.newPage({ viewport: { width: 1380, height: 940 } });
  try {
    await page.goto(app.job!.applyUrl.replace(/#app$/, ""), { waitUntil: "domcontentloaded" });
    if (app.job!.board === "greenhouse") await fillGreenhouse(page, app, notes);
    else await discoverAndFillGeneric(page, app, notes);
    await page.waitForTimeout(800);
    const shot = await page.screenshot({ fullPage: true });
    live.set(app.id, { page, app, filledAt: Date.now() });
    await report(app.id, { status: "filled", notes, screenshotBase64: shot.toString("base64") });
    log(`filled ${app.id} (${app.job!.company}), waiting for Submit in the app`);
  } catch (e) {
    const shot = await page.screenshot({ fullPage: true }).catch(() => null);
    await report(app.id, { status: "failed", error: `Runner: ${(e as Error).message}`, notes, screenshotBase64: shot?.toString("base64") });
    log(`fill failed ${app.id}:`, (e as Error).message);
  }
}

async function submit(app: Application) {
  let entry = live.get(app.id);
  if (!entry) {
    log(`no open tab for ${app.id}, refilling before submit`);
    await fill(app);
    entry = live.get(app.id);
    if (!entry) return;
  }
  try {
    const ok = app.job!.board === "greenhouse" ? await submitGreenhouse(entry.page) : await submitGeneric(entry.page);
    const shot = await entry.page.screenshot({ fullPage: true });
    await report(app.id, { status: ok ? "submitted" : "failed", notes: ["Submitted by runner after your approval"], screenshotBase64: shot.toString("base64") });
    log(`submitted ${app.id}`);
    await entry.page.close(); live.delete(app.id);
  } catch (e) {
    await report(app.id, { status: "filled", notes: [`Submit attempt: ${(e as Error).message}`] });
    log(`submit needs attention ${app.id}:`, (e as Error).message);
  }
}

async function loop() {
  log(`runner online, polling ${APP_URL}`);
  for (;;) {
    try {
      const { work, settings } = (await api("/next")) as { work: Application[]; settings: Settings };
      SETTINGS = settings;
      for (const app of work) {
        if (inFlight.has(app.id)) continue;
        inFlight.add(app.id);
        try {
          if (app.status === "approved" && !live.has(app.id)) await fill(app);
          else if (app.status === "submit_requested") await submit(app);
        } finally { inFlight.delete(app.id); }
      }
    } catch (e) { log("poll error:", (e as Error).message); }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
loop();
