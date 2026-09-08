/**
 * CLI: npx tsx scripts/generate.ts <job-url> [--out samples] [--layout-only]
 * Fetches the posting, tailors the resume with Workers AI, validates, renders a PDF,
 * and writes the JSON, HTML and PDF next to each other for review.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchJob } from "../src/lib/jobs/fetch";
import { tailorResume, sanitize, validate } from "../src/lib/resume/tailor";
import { renderPdf, masterAsTailored } from "../src/lib/resume/render";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : "samples";
const layoutOnly = args.includes("--layout-only");
mkdirSync(out, { recursive: true });

async function main() {
  if (layoutOnly) {
    const r = masterAsTailored();
    const res = await renderPdf(r);
    writeFileSync(join(out, "layout-check.pdf"), res.pdf);
    writeFileSync(join(out, "layout-check.html"), res.html);
    console.log(`layout-check.pdf written, content height ${res.heightPx}px, overflow=${res.overflow}`);
    return;
  }
  if (!url) throw new Error("usage: generate.ts <job-url> [--out dir] [--layout-only]");
  const job = await fetchJob(url);
  console.log(`[${job.board}] ${job.company}: ${job.title} (${job.location}) desc=${job.description.length} chars, questions=${job.questions.length}`);
  const t0 = Date.now();
  const result = await tailorResume(job);
  const resume = sanitize(result.resume);
  const warnings = [...result.warnings, ...validate(resume)];
  console.log(`tailored in ${((Date.now() - t0) / 1000).toFixed(1)}s, headline: ${result.resume.headline}`);
  console.log("JD summary:", result.jdSummary);
  for (const n of result.fitNotes) console.log(" fit:", n);
  for (const w of warnings) console.log(" WARN:", w);
  const res = await renderPdf(resume);
  const slug = `${job.company}-${job.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  writeFileSync(join(out, `${slug}.pdf`), res.pdf);
  writeFileSync(join(out, `${slug}.html`), res.html);
  writeFileSync(join(out, `${slug}.json`), JSON.stringify({ job: { ...job, description: job.description.slice(0, 2000) }, result, resume: res.resume, warnings, heightPx: res.heightPx, overflow: res.overflow, trims: res.trims, scale: res.scale }, null, 2));
  console.log(`${slug}.pdf written, content height ${res.heightPx}px, overflow=${res.overflow}, scale=${res.scale}, trims=${res.trims.join(" > ") || "none"}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
