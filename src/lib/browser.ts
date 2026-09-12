import type { Browser } from "playwright-core";
import { isVercel } from "./env";

/** Playwright locally, @sparticuz/chromium on Vercel. Both return a Playwright Browser. */
export async function launchBrowser(): Promise<Browser> {
  if (isVercel) {
    const sparticuz = (await import("@sparticuz/chromium")).default;
    const { chromium } = await import("playwright-core");
    return chromium.launch({ executablePath: await sparticuz.executablePath(), args: sparticuz.args, headless: true });
  }
  const { chromium } = await import("playwright");
  return chromium.launch();
}
