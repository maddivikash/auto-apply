import { fetchJob, UnsupportedJobUrl } from "../jobs/fetch";
import { tailorResume, sanitize, validate } from "../resume/tailor";
import { renderPdf } from "../resume/render";
import { answerFor, needsHuman } from "../defaults";
import { getApplication, saveApplication, saveFile, getProfile, getSettings, addNotification, type Application, type QuestionState } from "../store";
import { Settings } from "../profile/types";
import { launchBrowser } from "../browser";
import { emailNotPossible, emailResumeReady } from "../email";

/** Everything between "link pasted" and "resume ready". Safe to re-run: it overwrites. */
export async function processApplication(userId: string, id: string): Promise<void> {
  const app = await getApplication(userId, id);
  if (!app) throw new Error(`application ${id} not found`);
  const settings = Settings.parse((await getSettings(userId)) ?? {});
  const to = settings.notifyEmail || settings.email;
  const step = async (status: Application["status"]) => { app.status = status; await saveApplication(app); };

  try {
    const profile = await getProfile(userId);
    if (!profile) throw new Error("Add your profile first (Profile page) so the resume has something to work from.");

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
    app.questions = job.questions
      .filter((q) => !/^(longitude|latitude)$/i.test(q.label))
      .map((q): QuestionState => {
        const a = answerFor(settings, q.label, q.options, q.type);
        const human = q.type !== "file" && !a && (needsHuman(q.label, q.type) || q.required);
        return { ...q, answer: a?.value, source: a?.source, needsHuman: human };
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
