import { fetchJob, UnsupportedJobUrl } from "../jobs/fetch";
import { tailorResume, sanitize, validate } from "../resume/tailor";
import { renderPdf } from "../resume/render";
import { answerFor, needsHuman } from "../defaults";
import { getApplication, saveApplication, saveFile, type Application, type QuestionState } from "../store";
import { launchBrowser } from "../browser";
import { emailNotPossible, emailResumeReady } from "../email";

/** Everything between "link pasted" and "resume ready" email. Safe to re-run: it overwrites. */
export async function processApplication(id: string): Promise<void> {
  const app = await getApplication(id);
  if (!app) throw new Error(`application ${id} not found`);
  const step = async (status: Application["status"]) => { app.status = status; await saveApplication(app); };

  try {
    await step("fetching");
    let job;
    try {
      job = await fetchJob(app.url);
    } catch (e) {
      if (e instanceof UnsupportedJobUrl) {
        app.error = e.message; await step("unsupported");
        await emailNotPossible(app, e.message);
        return;
      }
      throw e;
    }
    const { description, ...rest } = job;
    app.job = { ...rest, descriptionPreview: description.slice(0, 1500) };
    app.questions = job.questions.map((q): QuestionState => {
      const a = answerFor(q.label, q.options, q.type);
      const human = needsHuman(q.label, q.type) && !a;
      return { ...q, answer: a?.value, source: a?.source, needsHuman: human };
    });
    // Boards without a public question list still have the standard fields; the runner handles those.

    await step("tailoring");
    const result = await tailorResume(job);
    const resume = sanitize(result.resume);
    app.jdSummary = result.jdSummary;
    app.fitNotes = result.fitNotes;
    app.headline = result.resume.headline;

    await step("rendering");
    const rendered = await renderPdf(resume, launchBrowser);
    app.resume = rendered.resume;
    app.trims = rendered.trims;
    app.resumeWarnings = [...result.warnings, ...validate(rendered.resume)].filter((w, i, a) => a.indexOf(w) === i);
    app.resumePdfUrl = await saveFile(`resumes/${id}.pdf`, rendered.pdf, "application/pdf");
    app.error = undefined;
    await step("ready");

    await emailResumeReady(app, rendered.pdf);
    app.emailedAt = new Date().toISOString();
    await saveApplication(app);
  } catch (e) {
    app.error = e instanceof Error ? e.message : String(e);
    await step("failed");
    console.error(`application ${id} failed:`, e);
  }
}
