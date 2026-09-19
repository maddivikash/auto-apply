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

/**
 * Where the Greenhouse form lives. Company careers pages (MongoDB, for one) embed it in an iframe;
 * when that is the case, open the iframe's own URL so the form is a plain page and every selector works.
 */
async function greenhouseRoot(page: Page): Promise<Page> {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (await page.locator("#first_name").isVisible().catch(() => false)) return page;
    const frame = page.frames().find((f) => /greenhouse\.io\/embed\/job_app/.test(f.url()));
    if (frame) {
      const url = frame.url();
      log(`greenhouse form is embedded, opening it directly: ${url.slice(0, 90)}`);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.locator("#first_name").waitFor({ state: "visible", timeout: 30000 });
      return page;
    }
    await page.waitForTimeout(1000);
  }
  throw new Error("Greenhouse form not found: no first-name field on the page and no embedded Greenhouse application frame");
}

async function fillGreenhouse(page: Page, app: Application, notes: string[]) {
  const root = await greenhouseRoot(page);
  const type = async (sel: string, value: string) => { const el = root.locator(sel).first(); if (!(await el.count())) return false; await el.scrollIntoViewIfNeeded(); await el.click(); await el.fill(""); await el.pressSequentially(value, { delay: 15 }); return true; };
  const pickOption = async (sel: string, typed: string, re: RegExp) => {
    const el = root.locator(sel).first(); if (!(await el.count())) return false;
    await el.scrollIntoViewIfNeeded(); await el.click(); await page.waitForTimeout(250);
    if (typed) await el.pressSequentially(typed, { delay: 30 });
    await page.waitForTimeout(900);
    const opts = root.getByRole("option"); const texts = await opts.allInnerTexts();
    const i = texts.findIndex((t) => re.test(t.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim()));
    if (i < 0) { await page.keyboard.press("Escape"); return false; }
    await opts.nth(i).click(); await page.waitForTimeout(300); return true;
  };

  await type("#first_name", SETTINGS.firstName);
  await type("#last_name", SETTINGS.lastName);
  await type("#email", SETTINGS.email);
  const phoneDigits = SETTINGS.phone.replace(/[^\d+]/g, "");
  const phoneCountry = SETTINGS.phoneCountry || (SETTINGS.workAuthorizedCountries || "").split(",")[0].trim() || countryFromPhone(SETTINGS.phone);
  if (await root.locator("#country").count()) {
    if (!phoneCountry) notes.push("Phone country unknown: set it on the Answers page");
    else (await pickOption("#country", phoneCountry, new RegExp(`^${phoneCountry}\\b`, "i"))) || notes.push(`Could not pick phone country ${phoneCountry}`);
  }
  await type("#phone", phoneDigits.replace(/^\+\d{1,3}/, ""));
  if (await root.locator("#candidate-location").count() && SETTINGS.location) {
    const city = SETTINGS.location.split(",")[0].trim();
    await type("#candidate-location", city);
    await page.waitForTimeout(1800);
    const opts = root.getByRole("option"); const texts = await opts.allInnerTexts();
    const i = texts.findIndex((t) => t.toLowerCase().includes(city.toLowerCase()));
    if (i >= 0) await opts.nth(i).click(); else notes.push(`Location autocomplete had no match for ${city}`);
  }
  const resumePath = await downloadResume(app);
  await root.locator("input#resume").setInputFiles(resumePath);
  await page.waitForTimeout(2500);
  notes.push("Resume attached");

  for (const q of app.questions) {
    if (q.type === "file") continue;
    // Location and its hidden geo fields were handled by the autocomplete above.
    if (/^(location|longitude|latitude)$/i.test(q.id) || /^location( \(city\))?$/i.test(q.label)) continue;
    const value = answerOf(app, q);
    const baseId = q.id.replace(/\[\]$/, "");
    const sel = `[id="${baseId.replace(/"/g, '\\"')}"]`;
    if (!value) { if (q.required) notes.push(`No answer for required: ${q.label}`); continue; }
    if (q.options?.length) {
      const ok = await pickOption(sel, "", new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));
      if (!ok) {
        // Checkbox groups (privacy acknowledgement) render as inputs named question_X[]
        const cb = root.locator(`input[name="${baseId}[]"]`).first();
        if (await cb.count()) { if (!(await cb.isChecked())) await cb.click({ force: true }); }
        else notes.push(`Could not select "${value}" for ${q.label}`);
      }
    } else {
      (await type(sel, value)) || notes.push(`Field not found: ${q.label}`);
    }
  }

  // Voluntary demographic survey: anything still unanswered gets the decline option, and the
  // consent box that Greenhouse requires alongside it is ticked. Both are noted so the user sees it.
  const demo = root.locator("#demographic-section");
  if (await demo.count()) {
    const selects = demo.locator('input[id][role="combobox"], input[id][aria-autocomplete]');
    for (let i = 0; i < await selects.count(); i++) {
      const el = selects.nth(i); const id = await el.getAttribute("id"); if (!id) continue;
      const shell = el.locator("xpath=ancestor::*[contains(@class,'select-shell')][1]");
      const chosen = (await shell.innerText().catch(() => "")).trim();
      if (chosen && !/^select/i.test(chosen)) continue;
      const label = (await root.locator(`label[for="${id}"]`).innerText().catch(() => "")).trim();
      const decline = /decline|prefer not|do not wish|don.t wish/i;
      if (/gender/i.test(label) && SETTINGS.gender && !decline.test(SETTINGS.gender)) {
        const mine = new RegExp(`^${SETTINGS.gender.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (await pickOption(`[id="${id}"]`, "", mine)) { notes.push(`Gender answered as ${SETTINGS.gender}`); continue; }
      }
      if (await pickOption(`[id="${id}"]`, "", decline)) notes.push(`${label || "Demographic question"}: answered with the decline option`);
    }
  }
  // The survey's consent checkbox sits after the section. Tick required consent boxes; leave marketing opt-ins alone.
  const boxes = root.locator('input[type="checkbox"]');
  for (let i = 0; i < await boxes.count(); i++) {
    const cb = boxes.nth(i);
    const id = await cb.getAttribute("id");
    const label = ((id && (await root.locator(`label[for="${id}"]`).innerText().catch(() => ""))) || (await cb.locator("xpath=ancestor::label[1]").innerText().catch(() => "")) || "").trim();
    if (!/consent|acknowledge|agree|i understand|i have read|i confirm/i.test(label) || /marketing|newsletter|alerts|stay up to date|contact me/i.test(label)) continue;
    if (!(await cb.isChecked())) { await cb.check({ force: true }); notes.push(`Ticked: ${label.slice(0, 70)}`); }
  }
}

/** Country from an international dialling prefix, for the phone country picker. */
function countryFromPhone(phone: string): string {
  const m = /^\+(\d{1,3})/.exec((phone || "").replace(/[\s()-]/g, ""));
  const map: Record<string, string> = { "1": "United States", "44": "United Kingdom", "91": "India", "49": "Germany", "33": "France", "61": "Australia", "65": "Singapore", "971": "United Arab Emirates", "81": "Japan", "31": "Netherlands", "353": "Ireland", "34": "Spain", "39": "Italy", "46": "Sweden", "41": "Switzerland", "55": "Brazil", "52": "Mexico", "27": "South Africa", "86": "China", "82": "South Korea" };
  if (!m) return "";
  return map[m[1]] || map[m[1].slice(0, 2)] || map[m[1].slice(0, 1)] || "";
}

async function submitGreenhouse(page: Page) {
  const root = await greenhouseRoot(page);
  await root.getByRole("button", { name: /submit application/i }).click();
  await page.waitForTimeout(4000);
  const text = (await root.locator("body").innerText()).toLowerCase();
  if (/thank you|application (has been )?submitted|we have received/i.test(text)) return true;
  if (/captcha|verify you are human/i.test(text)) throw new Error("reCAPTCHA challenge shown; complete it in the window and press Submit there.");
  const errors = await root.locator(".field-error, [role=alert], .error").allInnerTexts();
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
