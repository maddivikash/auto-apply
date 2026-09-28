/**
 * Renders public/sample-resume.png, the resume shown on the landing page, from the fictional test profile
 * so no real person's resume is published.
 *
 *   npx tsx scripts/make-sample-resume.mts
 */
import { chromium } from "playwright";
import { resumeHtml, profileAsTailored } from "../src/lib/resume/render";
import { TEST_PROFILE } from "./test-profile.mjs";

const browser = await chromium.launch();
// US Letter at 96 dpi, scaled so the PNG is 927 x 1200 like the image it replaces.
const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 1200 / 1056 });
await page.setContent(resumeHtml(profileAsTailored(TEST_PROFILE), TEST_PROFILE), { waitUntil: "networkidle" });
await page.screenshot({ path: "public/sample-resume.png" });
await browser.close();
console.log("wrote public/sample-resume.png");
