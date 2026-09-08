import { Resend } from "resend";
import type { Application } from "./store";

const FROM = process.env.RESEND_FROM || "Auto Apply <onboarding@resend.dev>";
const TO = process.env.EMAIL_TO || "vikashmaddi@gmail.com";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(title: string, body: string) {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:640px">
  <h2 style="margin:0 0 12px">${esc(title)}</h2>${body}
  <p style="color:#666;font-size:13px;margin-top:28px">Sent by your auto-apply app. Nothing is submitted until you press Submit in the app.</p></div>`;
}

async function send(subject: string, html: string, attachments?: { filename: string; content: Buffer }[]) {
  if (!process.env.RESEND_API_KEY) { console.warn("RESEND_API_KEY missing, email skipped:", subject); return; }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: FROM, to: TO, subject, html, attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) });
  if (error) throw new Error(`Resend: ${error.message}`);
}

export async function emailResumeReady(app: Application, pdf: Buffer) {
  const job = app.job!;
  const open = app.questions.filter((q) => q.needsHuman || (!q.answer && q.required && q.type !== "file"));
  const known = app.questions.filter((q) => q.answer && !q.needsHuman);
  const link = `${APP_URL}/a/${app.id}`;
  const body = `
  <p><b>${esc(job.company)}</b>, ${esc(job.title)}${job.location ? `, ${esc(job.location)}` : ""}<br><a href="${job.url}">${esc(job.url)}</a></p>
  <p>${esc(app.jdSummary || "")}</p>
  <p>The tailored resume is attached. Version: <i>${esc(app.headline || "")}</i>.${app.trims?.length ? ` To fit one page I removed: ${esc(app.trims.join(", "))}.` : ""}</p>
  ${app.fitNotes?.length ? `<p><b>Why it fits</b></p><ul>${app.fitNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
  ${open.length ? `<p><b>I need you for ${open.length} question${open.length > 1 ? "s" : ""}</b> (answer them at <a href="${link}">${esc(link)}</a>):</p>
    <ol>${open.map((q) => `<li>${esc(q.label)}${q.required ? " <span style='color:#b00'>*</span>" : ""}${q.options?.length ? `<br><span style="color:#555;font-size:13px">Options: ${esc(q.options.join(" / "))}</span>` : ""}</li>`).join("")}</ol>`
    : `<p><b>No open questions.</b> Everything on the form has a known answer.</p>`}
  ${known.length ? `<details><summary style="cursor:pointer">${known.length} answers I already have</summary><ul style="color:#444;font-size:13px">${known.map((q) => `<li>${esc(q.label)}: <b>${esc(q.answer!)}</b></li>`).join("")}</ul></details>` : ""}
  ${app.resumeWarnings?.length ? `<p style="color:#b00;font-size:13px">Checks flagged: ${esc(app.resumeWarnings.join("; "))}</p>` : ""}
  <p style="margin-top:20px"><a href="${link}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Review and approve</a></p>`;
  await send(`Resume ready: ${job.company}, ${job.title}`, wrap("Resume ready", body), [{ filename: `Vikash_Maddi_${job.company}.pdf`, content: pdf }]);
}

export async function emailNotPossible(app: Application, reason: string) {
  await send(`Can't auto-apply: ${app.url}`, wrap("This link is not supported", `<p>${esc(reason)}</p><p>Supported today: Greenhouse, Lever and Ashby job pages. You can still generate a tailored resume from the app by pasting the job description.</p>`));
}

export async function emailFormFilled(app: Application) {
  const job = app.job!;
  const link = `${APP_URL}/a/${app.id}`;
  await send(`Form filled, waiting for your Submit: ${job.company}, ${job.title}`, wrap("Form filled, not submitted",
    `<p>The application form for <b>${esc(job.company)}</b>, ${esc(job.title)} is filled in.${app.filledScreenshotUrl ? ` Screenshot: <a href="${app.filledScreenshotUrl}">view</a>.` : ""}</p>
     <p>Check it, then press <b>Submit</b> in the app. Nothing goes out until you do.</p>
     <p><a href="${link}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open application</a></p>`));
}

export async function emailSubmitted(app: Application) {
  const job = app.job!;
  await send(`Submitted: ${job.company}, ${job.title}`, wrap("Application submitted", `<p><b>${esc(job.company)}</b>, ${esc(job.title)} was submitted at ${esc(app.submittedAt || "")}.</p>${app.runnerNotes?.length ? `<ul>${app.runnerNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}`));
}
