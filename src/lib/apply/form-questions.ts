/**
 * Lever and Ashby do not publish their application questions through an API, so the only way to
 * know what a form asks before filling it is to open the form. This runs at preparation time on
 * the server, with the same discovery the runner uses, so every question reaches the user first.
 */
import type { JobQuestion } from "../jobs/fetch";
import { launchBrowser } from "../browser";
import { discoverLiveFields } from "./discover";

const TYPE: Record<string, JobQuestion["type"]> = { text: "text", textarea: "textarea", select: "select", group: "select", buttons: "select", checkbox: "checkbox", file: "file" };

export async function discoverFormQuestions(applyUrl: string, launch: () => Promise<Awaited<ReturnType<typeof launchBrowser>>> = launchBrowser): Promise<JobQuestion[]> {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.locator("form, input[name], textarea").first().waitFor({ timeout: 15000 }).catch(() => {});
    const fields = await discoverLiveFields(page);
    const seen = new Set<string>();
    const out: JobQuestion[] = [];
    for (const f of fields) {
      const key = f.label.toLowerCase();
      if (!f.label || seen.has(key)) continue;
      seen.add(key);
      // Demographic survey selects are voluntary and answered with "decline" by the runner; keep them out of the user's list.
      if (/^(gender|race|ethnicity|veteran|disability)/i.test(f.label) && f.options?.length) continue;
      out.push({ id: f.label, label: f.label, required: f.required, type: TYPE[f.type] || "unknown", options: f.options?.filter((o) => !/^select\b|^choose\b|^-+$/i.test(o)) });
    }
    return out;
  } finally {
    await browser.close().catch(() => {}); // a no-op when the pipeline shares its browser
  }
}
