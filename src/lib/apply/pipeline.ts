import { fetchJob, UnsupportedJobUrl } from "../jobs/fetch";
import { tailorResume, sanitize, validate } from "../resume/tailor";
import { renderPdf } from "../resume/render";
import { questionStates, withProfileFallback } from "./answers";
import { getApplication, saveApplication, saveFile, getProfile, getSettings, addNotification, type Application } from "../store";
import { Settings } from "../profile/types";
import { launchBrowser } from "../browser";
import { emailNotPossible, emailResumeReady } from "../email";

/** Everything between "link pasted" and "resume ready". Safe to re-run: it overwrites. */
export async function processApplication(userId: string, id: string): Promise<void> {
  const app = await getApplication(userId, id);
  if (!app) throw new Error(`application ${id} not found`);
  const t0 = Date.now();
  let last = t0;
  const step = async (status: Application["status"]) => {
    const now = Date.now();
    console.log(`application ${id}: ${app.status} took ${((now - last) / 1000).toFixed(1)}s, now ${status} (${((now - t0) / 1000).toFixed(1)}s total)`);
    last = now; app.status = status; await saveApplication(app);
  };

  try {
    const profile = await getProfile(userId);
    if (!profile) throw new Error("Add your profile first (Profile page) so the resume has something to work from.");
    const settings = withProfileFallback(Settings.parse((await getSettings(userId)) ?? {}), profile);
    const to = settings.notifyEmail || settings.email;

    await step("fetching");
    let job;
    try { job = await fetchJob(app.url); }
    catch (e) {
      if (e instanceof UnsupportedJobUrl) {
        app.error = e.message; await step("unsupported");
        await addNotification({ userId, kind: "unsupported", title: "Link not supported", body: app.url, applicationId: id });
        await emailNotPossible(to, app, e.message);
        return;
      }
      throw e;
    }
    const { description, ...rest } = job;
    app.job = { ...rest, descriptionPreview: description.slice(0, 1500) };
    // Keep answers the user typed on an earlier run; everything else is re-derived.
    const typed = new Map(app.questions.filter((q) => q.source === "user" && q.answer).map((q) => [q.label.toLowerCase(), q]));
    app.questions = questionStates(job.questions, settings, job.location).map((q) => {
      const t = typed.get(q.label.toLowerCase());
      return t ? { ...q, answer: t.answer, source: "user", needsHuman: false } : q;
    });

    await step("tailoring");
    const result = await tailorResume(job, profile);
    const resume = sanitize(result.resume);
    app.jdSummary = result.jdSummary; app.fitNotes = result.fitNotes; app.headline = result.resume.headline;

    await step("rendering");
    const rendered = await renderPdf(resume, profile, launchBrowser);
    app.resume = rendered.resume; app.trims = rendered.trims;
    app.resumeWarnings = [...result.warnings, ...validate(rendered.resume, profile)].filter((w, i, a) => a.indexOf(w) === i);
    app.resumePdfUrl = await saveFile(`users/${userId}/resumes/${id}.pdf`, rendered.pdf, "application/pdf");
    app.error = undefined;
    await step("ready");

    const open = app.questions.filter((q) => q.needsHuman).length;
    await addNotification({ userId, kind: open ? "needs_details" : "ready", applicationId: id, title: `Resume ready for ${job.company}`, body: open ? `${open} question${open > 1 ? "s" : ""} need your answer before approval.` : "All form questions have answers. Review and approve." });
    await emailResumeReady(to, app, rendered.pdf);
    app.emailedAt = new Date().toISOString();
    await saveApplication(app);
  } catch (e) {
    app.error = e instanceof Error ? e.message : String(e);
    await step("failed");
    await addNotification({ userId, kind: "failed", applicationId: id, title: `Could not prepare ${app.job?.company || "application"}`, body: app.error });
    console.error(`application ${id} failed:`, e);
  }
}
