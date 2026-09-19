import { Resend } from "resend";
import type { Application } from "./store";

const FROM = process.env.RESEND_FROM || "Auto Apply <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(title: string, body: string) {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#171A21;max-width:640px">
  <h2 style="margin:0 0 12px;font-weight:600">${esc(title)}</h2>${body}
  <p style="color:#6B7280;font-size:13px;margin-top:28px">Sent by Auto Apply. Nothing is submitted until you press Submit in the app.</p></div>`;
}

/** Set by callers that know the user, so a failed send can be shown in the app instead of vanishing into a log. */
let onFailure: ((message: string) => Promise<void>) | null = null;
export function reportEmailFailuresTo(fn: ((message: string) => Promise<void>) | null) { onFailure = fn; }

async function send(to: string, subject: string, html: string, attachments?: { filename: string; content: Buffer }[]) {
  if (!process.env.RESEND_API_KEY || !to) { console.warn("email skipped:", subject); return; }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: FROM, to, subject, html, attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) });
  if (error) {
    console.error(`Resend: ${error.message}`);
    const friendly = /only send testing emails to your own email address/i.test(error.message)
      ? `Email to ${to} was refused: the Resend account is in testing mode and only delivers to its owner's address. Set that address as your notification email on the Answers page, or verify a sending domain at resend.com/domains.`
      : `Email to ${to} could not be sent: ${error.message}`;
    await onFailure?.(friendly).catch(() => {});
  }
}

export async function emailResumeReady(to: string, app: Application, pdf: Buffer, fileName = "Resume.pdf") {
  const job = app.job!;
  const open = app.questions.filter((q) => q.needsHuman);
  const link = `${APP_URL}/a/${app.id}`;
  const body = `
  <p><b>${esc(job.company)}</b>, ${esc(job.title)}${job.location ? `, ${esc(job.location)}` : ""}<br><a href="${job.url}">${esc(job.url)}</a></p>
  <p>${esc(app.jdSummary || "")}</p>
  <p>The tailored resume is attached.${app.trims?.length ? ` To fit one page: ${esc(app.trims.join(", "))}.` : ""}</p>
  ${open.length ? `<p><b>${open.length} question${open.length > 1 ? "s" : ""} need you</b> (answer at <a href="${link}">${esc(link)}</a>):</p>
    <ol>${open.map((q) => `<li>${esc(q.label)}${q.required ? " *" : ""}${q.options?.length ? `<br><span style="color:#6B7280;font-size:13px">Options: ${esc(q.options.join(" / "))}</span>` : ""}</li>`).join("")}</ol>`
    : `<p><b>No open questions.</b> Everything on the form has a known answer.</p>`}
  <p style="margin-top:20px"><a href="${link}" style="background:#166534;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Review and approve</a></p>`;
  await send(to, `Resume ready: ${job.company}, ${job.title}`, wrap("Resume ready", body), [{ filename: fileName, content: pdf }]);
}
export async function emailNotPossible(to: string, app: Application, reason: string) {
  await send(to, `Can't auto-apply: ${app.url}`, wrap("This link is not supported", `<p>${esc(reason)}</p><p>Supported today: Greenhouse, Lever and Ashby job pages.</p>`));
}
export async function emailFormFilled(to: string, app: Application) {
  const job = app.job!; const link = `${APP_URL}/a/${app.id}`;
  await send(to, `Form filled, waiting for your Submit: ${job.company}`, wrap("Form filled, not submitted", `<p>The form for <b>${esc(job.company)}</b>, ${esc(job.title)} is filled in.${app.filledScreenshotUrl ? ` <a href="${link}">See the screenshot</a>.` : ""}</p><p>Check it, then press <b>Submit</b> in the app.</p><p><a href="${link}" style="background:#166534;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open application</a></p>`));
}
export async function emailCodeRequired(to: string, app: Application) {
  const job = app.job!; const link = `${APP_URL}/a/${app.id}`;
  await send(to, `Action needed: enter the verification code for ${job.company}`, wrap("Greenhouse wants a verification code", `<p>To finish submitting to <b>${esc(job.company)}</b>, ${esc(job.title)}, Greenhouse has emailed you an 8-character security code (look for a message from Greenhouse or no-reply@greenhouse.io).</p><p>Type that code into the application page and the runner finishes the submit.</p><p><a href="${link}" style="background:#166534;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Enter the code</a></p>`));
}

export async function emailSubmitted(to: string, app: Application) {
  const job = app.job!;
  await send(to, `Submitted: ${job.company}, ${job.title}`, wrap("Application submitted", `<p><b>${esc(job.company)}</b>, ${esc(job.title)} was submitted.</p>`));
}
