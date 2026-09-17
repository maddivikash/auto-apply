import type { Browser } from "playwright-core";
import { isVercel } from "./env";

/**
 * Single place that launches Chromium. Always goes through playwright-core so the
 * dev-only `playwright` package is never pulled into the Vercel function bundle.
 * On Vercel the binary comes from @sparticuz/chromium; locally from `npx playwright install chromium`.
 */
export async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import("playwright-core");
  if (isVercel) {
    const sparticuz = (await import("@sparticuz/chromium")).default;
    return chromium.launch({ executablePath: await sparticuz.executablePath(), args: sparticuz.args, headless: true });
  }
  return chromium.launch();
}
