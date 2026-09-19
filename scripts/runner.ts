/**
 * Local runner. Polls the web app for approved applications, fills the form in a
 * visible Chromium window, screenshots it, and reports "filled". It keeps that
 * tab open and submits only when the app says submit_requested.
 *
 *   APP_URL=https://auto-apply-vikash.vercel.app RUNNER_TOKEN=... npx tsx scripts/runner.ts
 */
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { answerFor } from "../src/lib/defaults";
import { resumeFileName } from "../src/lib/resume/filename";
import { parsedEducation, degreeOptionPatterns, disciplineScore, schoolQueries, DISCIPLINE_MIN, type ParsedEducation } from "../src/lib/apply/education";
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
let browser: Browser | BrowserContext | null = null;
/** When each host last accepted a submit, and until when a host is backing off after a spam flag. */
let lastSubmitAt = 0;
const hostBackoffUntil = new Map<string, number>();
const SUBMIT_GAP_MS = 90_000;
const SPAM_BACKOFF_MS = 6 * 60_000;
const jitter = (min: number, max: number) => min + Math.random() * (max - min);

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

/**
 * The user's own Chrome with a persistent profile, so the forms see an ordinary browser with real cookies
 * and history, not Playwright's bundled Chromium announcing itself as automated. These are the user's own
 * applications; the point is not to be misfiled as spam, not to hide anything.
 */
async function getBrowser(): Promise<Browser | BrowserContext> {
  if (browser && (("isConnected" in browser && browser.isConnected()) || !("isConnected" in browser))) return browser;
  const profile = join(homedir(), ".auto-apply", "chrome-profile"); mkdirSync(profile, { recursive: true });
  try {
    browser = await chromium.launchPersistentContext(profile, { channel: "chrome", headless: false, viewport: null, args: ["--window-size=1400,1000", "--disable-blink-features=AutomationControlled"], ignoreDefaultArgs: ["--enable-automation"] });
    log("using installed Chrome with a persistent profile");
  } catch (e) {
    log("installed Chrome not available, falling back to bundled Chromium:", (e as Error).message.split("\n")[0]);
    browser = await chromium.launch({ headless: false, args: ["--window-size=1400,1000"] });
  }
  return browser;
}

/** Space submits like a person would: one at a time, at least 90 s apart, and leave a host alone for a while after it flagged us. */
async function paceSubmit(url: string) {
  const host = new URL(url).host;
  const until = hostBackoffUntil.get(host) || 0;
  if (Date.now() < until) { log(`${host} flagged a submit recently; waiting ${Math.ceil((until - Date.now()) / 1000)}s before the next one`); await new Promise((r) => setTimeout(r, until - Date.now())); }
  const wait = lastSubmitAt + SUBMIT_GAP_MS - Date.now();
  if (wait > 0) { log(`pacing: next submit in ${Math.ceil(wait / 1000)}s`); await new Promise((r) => setTimeout(r, wait)); }
}

async function downloadResume(app: Application): Promise<string> {
  const dir = join(tmpdir(), "auto-apply"); mkdirSync(dir, { recursive: true });
  // The uploaded file's name is what the recruiter sees: the person's name, never the company.
  const p = join(dir, resumeFileName(SETTINGS.firstName, SETTINGS.lastName));
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
  const type = async (sel: string, value: string) => { const el = root.locator(sel).first(); if (!(await el.count())) return false; await el.scrollIntoViewIfNeeded(); await el.click(); await el.fill(""); await el.pressSequentially(value, { delay: jitter(35, 80) }); return true; };
  const norm = (t: string) => t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();
  const labelOf = async (cb: Locator) => {
    const id = await cb.getAttribute("id");
    return (id && (await root.locator(`label[for="${id}"]`).first().innerText().catch(() => ""))) || (await cb.locator("xpath=ancestor::label[1]").innerText().catch(() => "")) || "";
  };
  const pickOption = async (sel: string, typed: string, re: RegExp) => {
    const el = root.locator(sel).first(); if (!(await el.count())) return false;
    try {
      await el.scrollIntoViewIfNeeded(); await el.click(); await page.waitForTimeout(250);
      if (typed) { await el.fill("").catch(() => {}); await el.pressSequentially(typed, { delay: 30 }); }
      await page.waitForTimeout(typed ? 1400 : 900);
      const opts = root.getByRole("option"); const texts = await opts.allInnerTexts();
      const i = texts.findIndex((t) => re.test(t.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim()));
      if (i < 0) { await page.keyboard.press("Escape"); return false; }
      await opts.nth(i).click(); await page.waitForTimeout(300); return true;
    } catch (e) { if (/not attached|detached/i.test((e as Error).message)) return false; throw e; }
  };
  /** Open a combobox, read every option, and choose with a scoring function. Returns the chosen text. */
  const pickBest = async (sel: string, score: (option: string) => number, min: number, fallback?: RegExp) => {
    const el = root.locator(sel).first(); if (!(await el.count())) return undefined;
    await el.scrollIntoViewIfNeeded(); await el.click(); await page.waitForTimeout(900);
    const opts = root.getByRole("option"); const texts = await opts.allInnerTexts();
    let best = -1, bestScore = min;
    texts.forEach((t, i) => { const sc = score(t); if (sc > bestScore) { bestScore = sc; best = i; } });
    if (best < 0 && fallback) best = texts.findIndex((t) => fallback.test(t));
    if (best < 0) { await page.keyboard.press("Escape"); return undefined; }
    await opts.nth(best).click(); await page.waitForTimeout(300); return texts[best];
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
      const exact = new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      // Long lists (schools, countries) only show matches for what is typed, so try typing the value when the bare list has no match.
      const ok = (await pickOption(sel, "", exact)) || (await pickOption(sel, value.slice(0, 40), exact));
      if (!ok) {
        // Checkbox groups ("select all that apply", privacy acknowledgement) render as inputs named question_X[].
        // Tick the box whose label matches the answer, never simply the first one: a sanctions question ticked
        // wrong is worse than one left blank.
        const boxes = root.locator(`input[name="${baseId}[]"]`);
        const n = await boxes.count();
        if (!n) { notes.push(`Could not select "${value}" for ${q.label}`); continue; }
        const wanted = value.split(/\s*\|\s*/).map(norm);
        let hits = 0;
        for (let i = 0; i < n; i++) {
          // Greenhouse re-renders the whole group after a click, so resolve the box fresh for every step and retry once if it detached.
          const cb = () => root.locator(`input[name="${baseId}[]"]`).nth(i);
          const match = wanted.includes(norm(await labelOf(cb())));
          for (let attempt = 0; attempt < 2; attempt++) {
            try { if (match !== (await cb().isChecked())) await cb().click({ force: true }); break; }
            catch (e) { if (attempt === 1 || !/not attached|detached/i.test((e as Error).message)) throw e; await page.waitForTimeout(400); }
          }
          if (match) hits++;
        }
        if (!hits && n === 1) { const cb = boxes.first(); if (!(await cb.isChecked())) await cb.click({ force: true }); hits = 1; }
        if (hits) notes.push(`${q.label.replace(/\s+/g, " ").slice(0, 60)}: ${value}`);
        else notes.push(`Could not select "${value}" for ${q.label}; left blank for you to tick`);
      }
    } else {
      (await type(sel, value)) || notes.push(`Field not found: ${q.label}`);
    }
  }

  await fillGreenhouseEducation(root, page, notes, pickOption, pickBest);

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

/**
 * Greenhouse's Education block, found by labels, never by ids (they differ between forms: school--0,
 * start-date-year-0, ...). One row per profile entry, most recent first, adding rows with "Add another".
 * Every step is best-effort and noted; a wrong school is worse than an empty one.
 */
async function fillGreenhouseEducation(root: Page, page: Page, notes: string[], pickOption: (sel: string, typed: string, re: RegExp) => Promise<boolean>, pickBest: (sel: string, score: (o: string) => number, min: number, fallback?: RegExp) => Promise<string | undefined>) {
  const entries = parsedEducation(SETTINGS.education);
  if (!entries.length) return;
  type Kind = "school" | "degree" | "discipline" | "startMonth" | "startYear" | "endMonth" | "endYear";
  const rows = () => root.evaluate(() => {
    const kinds: [RegExp, string][] = [[/^school\b/i, "school"], [/^degree\b/i, "degree"], [/^discipline\b|field of study|^major\b/i, "discipline"], [/start.*month/i, "startMonth"], [/start.*year/i, "startYear"], [/end.*month/i, "endMonth"], [/end.*year/i, "endYear"]];
    const out: Record<string, Record<string, string>> = {};
    document.querySelectorAll<HTMLInputElement>("input").forEach((el) => {
      if (!el.id) return;
      const label = (document.querySelector(`label[for="${el.id}"]`)?.textContent || "").replace(/\s+/g, " ").replace(/\*/g, "").trim();
      const kind = kinds.find(([re]) => re.test(label))?.[1];
      if (!kind) return;
      const idx = /(\d+)\s*$/.exec(el.id)?.[1] ?? "0";
      (out[idx] ||= {})[kind] = el.id;
    });
    return out;
  });
  let table = await rows();
  if (!Object.keys(table).length) return;
  const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (let i = 0; i < Math.min(entries.length, 3); i++) {
    const e = entries[i];
    let row = table[String(i)];
    if (!row) {
      const add = root.getByText(/add another|add education/i).first();
      if (!(await add.count())) break;
      await add.click(); await page.waitForTimeout(700); table = await rows(); row = table[String(i)];
      if (!row) break;
    }
    const id = (k: Kind) => (row[k] ? `[id="${row[k]}"]` : undefined);
    try {
      if (id("school") && e.school) {
        const plain = e.school.replace(/\s*\([^)]*\)/g, "").trim();
        const re = new RegExp(esc(plain), "i");
        let ok = false;
        for (const q of schoolQueries(e.school)) { if (await pickOption(id("school")!, q, re)) { ok = true; break; } }
        if (!ok) { const alt = await pickOption(id("school")!, "", /not listed|other|not attend/i); notes.push(alt ? `School "${e.school}" is not in the form's list; chose the "not listed / other" option` : `Could not find school "${e.school}" in the list; left blank`); }
      }
      if (id("degree")) {
        let ok = false;
        for (const re of degreeOptionPatterns(e.level)) { if (await pickOption(id("degree")!, "", re)) { ok = true; break; } }
        if (!ok && !(await pickOption(id("degree")!, "", /other/i))) notes.push(`Could not pick a degree for "${e.degreeText}"`);
      }
      if (id("discipline")) {
        const chosen = e.discipline ? await pickBest(id("discipline")!, (o) => disciplineScore(o, e.discipline), DISCIPLINE_MIN, /other/i) : await pickBest(id("discipline")!, () => 0, 1, /other/i);
        if (chosen && e.discipline && disciplineScore(chosen, e.discipline) < 1) notes.push(`Discipline "${e.discipline}" mapped to "${chosen}"`);
        if (!chosen) notes.push(`Could not pick a discipline for "${e.discipline || e.degreeText}"`);
      }
      if (id("startMonth") && e.startMonth) await pickOption(id("startMonth")!, "", new RegExp(`^${e.startMonth}$`, "i"));
      if (id("startYear") && e.startYear) await root.locator(id("startYear")!).fill(e.startYear);
      if (id("endMonth") && e.endMonth) await pickOption(id("endMonth")!, "", new RegExp(`^${e.endMonth}$`, "i"));
      if (id("endYear") && e.endYear) await root.locator(id("endYear")!).fill(e.endYear);
      if ((id("endYear") || id("endMonth")) && !e.endYear) notes.push(`${e.school}: end date not in your profile, left for you`);
      notes.push(`Education: ${e.school}, ${e.degreeText}${e.endYear ? `, ${e.endYear}` : ""}`);
    } catch (err) { notes.push(`Education row ${i + 1} (${e.school}): ${(err as Error).message.split("\n")[0].slice(0, 100)}`); }
  }
}

/**
 * Ashby's education block: a "Search schools..." combobox, Degree and Field of Study text inputs,
 * a Still Student box, and "+ Add Education" for more rows. Found by labels and placeholders only.
 */
async function fillAshbyEducation(page: Page, notes: string[]) {
  const entries = parsedEducation(SETTINGS.education);
  const search = page.getByPlaceholder(/search schools/i);
  if (!entries.length || !(await search.count())) return;
  for (let i = 0; i < Math.min(entries.length, 3); i++) {
    const e = entries[i];
    if ((await search.count()) <= i) {
      const add = page.getByText(/add education/i).first();
      if (!(await add.count())) break;
      await add.click(); await page.waitForTimeout(600);
      if ((await search.count()) <= i) break;
    }
    try {
      const box = search.nth(i);
      let ok = false;
      for (const q of schoolQueries(e.school)) {
        await box.click(); await box.fill(""); await box.pressSequentially(q, { delay: 30 }); await page.waitForTimeout(1500);
        const opts = page.getByRole("option"); const texts = await opts.allInnerTexts();
        const plain = e.school.replace(/\s*\([^)]*\)/g, "").trim().toLowerCase();
        const j = texts.findIndex((t) => t.toLowerCase().includes(plain) || plain.includes(t.toLowerCase().trim()));
        if (j >= 0) { await opts.nth(j).click(); ok = true; break; }
        await page.keyboard.press("Escape");
      }
      if (!ok) notes.push(`Ashby: school "${e.school}" not found in the search; left blank`);
      const degree = page.getByLabel(/^degree/i).nth(i); if (await degree.count()) { await degree.fill(e.degreeText); }
      const field = page.getByLabel(/field of study|major|discipline/i).nth(i); if (await field.count()) { await field.fill(e.discipline || e.degreeText); }
      const still = page.getByLabel(/still (a )?student/i).nth(i); if (await still.count() && e.current && !(await still.isChecked())) await still.check();
      notes.push(`Education: ${e.school}, ${e.degreeText}`);
    } catch (err) { notes.push(`Education row ${i + 1} (${e.school}): ${(err as Error).message.split("\n")[0].slice(0, 100)}`); }
  }
}

/** Country from an international dialling prefix, for the phone country picker. */
function countryFromPhone(phone: string): string {
  const m = /^\+(\d{1,3})/.exec((phone || "").replace(/[\s()-]/g, ""));
  const map: Record<string, string> = { "1": "United States", "44": "United Kingdom", "91": "India", "49": "Germany", "33": "France", "61": "Australia", "65": "Singapore", "971": "United Arab Emirates", "81": "Japan", "31": "Netherlands", "353": "Ireland", "34": "Spain", "39": "Italy", "46": "Sweden", "41": "Switzerland", "55": "Brazil", "52": "Mexico", "27": "South Africa", "86": "China", "82": "South Korea" };
  if (!m) return "";
  return map[m[1]] || map[m[1].slice(0, 2)] || map[m[1].slice(0, 1)] || "";
}

const CODE_INPUTS = 'input[autocomplete="one-time-code"], input[maxlength="1"], input[name*="code" i], input[id*="code" i], input[aria-label*="code" i]';

/** After Submit, Greenhouse may ask for an emailed code before it accepts the application. */
async function codeScreenShown(root: Page) {
  const text = (await root.locator("body").innerText().catch(() => "")).toLowerCase();
  return /verification code was sent|security code|enter the .{0,12}code/.test(text) && (await root.locator(CODE_INPUTS).count()) > 0;
}

async function submitGreenhouse(page: Page): Promise<"submitted" | "code_required"> {
  const root = await greenhouseRoot(page);
  await root.getByRole("button", { name: /submit application/i }).click();
  await page.waitForTimeout(4000);
  if (await codeScreenShown(root)) return "code_required";
  const text = (await root.locator("body").innerText()).toLowerCase();
  if (/thank you|application (has been )?submitted|we have received/i.test(text)) return "submitted";
  if (/captcha|verify you are human/i.test(text)) throw new Error("reCAPTCHA challenge shown; complete it in the window and press Submit there.");
  const errors = await root.locator(".field-error, [role=alert], .error").allInnerTexts();
  throw new Error(`No confirmation after submit. ${errors.filter(Boolean).slice(0, 3).join(" | ")}`);
}

/** Type the emailed code into Greenhouse's boxes and confirm. Returns true on the thank-you page. */
async function enterGreenhouseCode(page: Page, code: string): Promise<boolean> {
  const inputs = page.locator(CODE_INPUTS);
  const n = await inputs.count();
  if (n === 0) throw new Error("The code boxes are no longer on the page");
  if (n >= code.length) { for (let i = 0; i < code.length; i++) { await inputs.nth(i).click(); await inputs.nth(i).fill(code[i]); } }
  else { await inputs.first().click(); await inputs.first().fill(""); await inputs.first().pressSequentially(code, { delay: 40 }); }
  await page.waitForTimeout(600);
  const btn = page.getByRole("button", { name: /submit|verify|confirm|continue/i }).last();
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(5000);
  const text = (await page.locator("body").innerText()).toLowerCase();
  return /thank you|application (has been )?submitted|we have received/i.test(text);
}

// ---- Lever / Ashby: generic label-driven fill ------------------------------

async function discoverAndFillGeneric(page: Page, app: Application, notes: string[]) {
  // Lever and Ashby pages keep analytics beacons open, so "networkidle" may never arrive. Wait for the
  // document, give the network a short grace period, then wait for the form itself.
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.locator("form, input[type=file], input[name], textarea").first().waitFor({ timeout: 20000 }).catch(() => { throw new Error("The application form did not appear within 20 seconds; the posting may have closed or need a click to open the form."); });
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
      else { const el = page.locator(f.selector).first(); await el.scrollIntoViewIfNeeded(); await el.fill(""); await el.pressSequentially(value, { delay: jitter(35, 80) }); }
    } catch (e) { notes.push(`Could not fill "${f.label}": ${(e as Error).message.slice(0, 80)}`); }
  }
  await fillAshbyEducation(page, notes);
  // Education rows are filled above; do not report their fields as unanswered.
  const eduLabel = /search schools|^degree$|field of study|still (a )?student/i;
  const stillOpen = unanswered.filter((u) => !eduLabel.test(u.label));
  if (stillOpen.length) {
    notes.push(`${stillOpen.length} field(s) need your answer: ${stillOpen.map((u) => u.label).join("; ")}`);
    await report(app.id, { questions: stillOpen });
  }
}

async function submitGeneric(page: Page) {
  const btn = page.getByRole("button", { name: /submit( application)?|apply/i }).last();
  await btn.scrollIntoViewIfNeeded(); await page.waitForTimeout(jitter(800, 2000));
  await btn.hover(); await page.waitForTimeout(jitter(200, 600));
  await btn.click();
  await page.waitForTimeout(5000);
  const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  if (/thank you|submitted|we('ve| have) received|success/i.test(text)) return true;
  if (/flagged as (possible )?spam|couldn'?t submit your application|unusual (traffic|activity)/i.test(text)) {
    hostBackoffUntil.set(new URL(page.url()).host, Date.now() + SPAM_BACKOFF_MS);
    throw new Error("The site flagged the submission as possible spam. The form is still filled in the window: wait a few minutes, then press Submit there yourself, and use Mark as submitted here. The runner will not retry this host for a while.");
  }
  if (/captcha|robot|verify you are human/i.test(text) || (await page.locator("iframe[src*=hcaptcha], iframe[src*=recaptcha], iframe[src*=turnstile]").count())) throw new Error("A captcha is shown. Solve it in the window, press Submit there, then use Mark as submitted here.");
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
    // Playwright appends a wall of "=== logs ===" to timeout errors; the first line is the message.
    await report(app.id, { status: "failed", error: `Runner: ${(e as Error).message.split("\n")[0].slice(0, 200)}`, notes, screenshotBase64: shot?.toString("base64") });
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
    const outcome = app.job!.board === "greenhouse" ? await submitGreenhouse(entry.page) : (await submitGeneric(entry.page)) ? "submitted" : "failed";
    const shot = await entry.page.screenshot({ fullPage: true });
    if (outcome === "code_required") {
      await report(app.id, { status: "code_required", notes: ["Greenhouse asked for the emailed verification code"], screenshotBase64: shot.toString("base64") });
      log(`code required for ${app.id}, waiting for the user to type it in the app`);
      return;
    }
    await report(app.id, { status: outcome, notes: ["Submitted by runner after your approval"], screenshotBase64: shot.toString("base64") });
    log(`submitted ${app.id}`);
    await entry.page.close(); live.delete(app.id);
  } catch (e) {
    const msg = (e as Error).message;
    if (/has been closed/i.test(msg)) {
      live.delete(app.id);
      await report(app.id, { status: "filled", error: "The form tab was closed. If you submitted it yourself, use Mark as submitted; otherwise press Submit again and the runner refills the form.", notes: ["Submit attempt: the browser tab was closed"] });
      log(`tab closed for ${app.id}`);
      return;
    }
    await report(app.id, { status: "filled", notes: [`Submit attempt: ${msg.slice(0, 160)}`] });
    log(`submit needs attention ${app.id}:`, msg);
  }
}

async function enterCode(app: Application) {
  const entry = live.get(app.id);
  if (!entry) {
    await report(app.id, { status: "filled", notes: ["The form tab was lost before the code arrived. Press Submit again; a new code will be sent."], error: "Runner restarted; press Submit again." });
    return;
  }
  try {
    const ok = await enterGreenhouseCode(entry.page, app.verificationCode!);
    const shot = await entry.page.screenshot({ fullPage: true });
    if (ok) {
      await report(app.id, { status: "submitted", notes: ["Verification code accepted, application submitted"], screenshotBase64: shot.toString("base64") });
      log(`submitted ${app.id} after code`);
      await entry.page.close(); live.delete(app.id);
    } else {
      await report(app.id, { status: "code_required", error: "Greenhouse did not accept that code. Check the newest email and try again.", notes: ["Code rejected"], screenshotBase64: shot.toString("base64") });
      log(`code rejected for ${app.id}`);
    }
  } catch (e) {
    await report(app.id, { status: "code_required", error: `Could not enter the code: ${(e as Error).message.slice(0, 120)}`, notes: [`Code entry: ${(e as Error).message}`] });
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
          else if (app.status === "submit_requested") { await paceSubmit(app.job!.applyUrl); await submit(app); lastSubmitAt = Date.now(); }
          else if (app.status === "code_required" && app.verificationCode) await enterCode(app);
        } finally { inFlight.delete(app.id); }
      }
    } catch (e) { log("poll error:", (e as Error).message); }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
loop();
