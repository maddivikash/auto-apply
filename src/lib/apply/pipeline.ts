import { fetchJob, UnsupportedJobUrl } from "../jobs/fetch";
import { tailorResume, sanitize, validate } from "../resume/tailor";
import { renderPdf } from "../resume/render";
import { profileAsResume } from "../resume/default";
import { matchResume } from "../resume/match";
import { questionStates, withProfileFallback } from "./answers";
import { getApplication, saveApplication, saveFile, getProfile, getSettings, addNotification, applyResumeChoice, type Application } from "../store";
import { Settings } from "../profile/types";
import { launchBrowser } from "../browser";
import { emailNotPossible, emailResumeReady } from "../email";
import { resumeFileName } from "../resume/filename";

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

    // Tailor, render, measure. A tailored resume that matches the posting worse than the raw profile is
    // a regression, so retry with the dropped terms called out and keep whichever attempt scores best.
    const attempt = async (notes?: string, previous?: typeof app.resume) => {
      await step("tailoring");
      const result = await tailorResume(job, profile, { notes, previous });
      await step("rendering");
      const rendered = await renderPdf(sanitize(result.resume), profile, launchBrowser);
      return { result, rendered, match: matchResume(description, rendered.resume, profile) };
    };
    let best = await attempt(app.revisionNotes, app.resume);
    const MAX_RETRIES = 2;
    let retries = 0;
    while (best.match.tailored < best.match.profile && retries < MAX_RETRIES) {
      retries++;
      console.log(`application ${id}: tailored match ${best.match.tailored} < profile ${best.match.profile}, retry ${retries}`);
      const notes = [
        app.revisionNotes?.trim(),
        `Keyword check: this version matches ${best.match.tailored}% of the job's terms while the untailored full profile matches ${best.match.profile}%, so the selection dropped material that was relevant. Fix it by selection, not rewriting: bring back the master bullets, projects and skill items that already contain these terms, and keep everything already matched: ${best.match.missing.slice(0, 15).join(", ")}. Do not rephrase bullets into the job's words, do not add terms that are not in the master, and keep the overfitting limits from the writing rules.`
      ].filter(Boolean).join("\n\n");
      const next = await attempt(notes, best.rendered.resume);
      if (next.match.tailored > best.match.tailored) best = next;
    }
    const { result, rendered } = best;
    // The full profile laid out as-is is always rendered too, so the user can switch and so a tailored
    // version that scores lower than the plain resume is never the default.
    await step("rendering");
    const plain = await renderPdf(profileAsResume(profile), profile, launchBrowser);
    const plainMatch = matchResume(description, plain.resume, profile);
    const [tailoredUrl, fullUrl] = await Promise.all([
      saveFile(`users/${userId}/resumes/${id}.pdf`, rendered.pdf, "application/pdf"),
      saveFile(`users/${userId}/resumes/${id}-full.pdf`, plain.pdf, "application/pdf")
    ]);
    app.variants = {
      tailored: { resume: rendered.resume, pdfUrl: tailoredUrl, match: best.match, headline: result.resume.headline, trims: rendered.trims },
      full: { resume: plain.resume, pdfUrl: fullUrl, match: plainMatch, headline: profile.roles[0]?.title, trims: plain.trims }
    };
    const choice: "tailored" | "full" = best.match.tailored >= plainMatch.tailored ? "tailored" : "full";
    applyResumeChoice(app, choice);
    app.jdSummary = result.jdSummary;
    app.fitNotes = choice === "tailored" ? result.fitNotes : [`Tailoring did not improve the keyword match for this posting (best attempt ${best.match.tailored}%, full resume ${plainMatch.tailored}%), so your full resume is selected. You can switch to the tailored version on this page.`];
    const notice = choice === "full"
      ? [`We could not find a tailored version that matches this posting better than your full resume (${best.match.tailored}% vs ${plainMatch.tailored}% after ${retries + 1} attempts), so the full resume is used. Switch to the tailored one above if you prefer it.`]
      : best.match.tailored < best.match.profile ? [`Keyword match ${best.match.tailored}% is below your raw profile text's ${best.match.profile}%, but still above the full resume once fitted to one page (${plainMatch.tailored}%).`] : [];
    const sparse = rendered.sparse ? ["Your profile is on the light side, so the type was enlarged to fill the page. Add a few more bullets or a project on the Profile page for a denser resume."] : [];
    app.resumeWarnings = [...result.warnings, ...validate(rendered.resume, profile), ...sparse, ...notice].filter((w, i, a) => a.indexOf(w) === i);
    app.error = undefined;
    await step("ready");

    const open = app.questions.filter((q) => q.needsHuman).length;
    await addNotification({ userId, kind: open ? "needs_details" : "ready", applicationId: id, title: `Resume ready for ${job.company}`, body: open ? `${open} question${open > 1 ? "s" : ""} need your answer before approval.` : "All form questions have answers. Review and approve." });
    await emailResumeReady(to, app, rendered.pdf, resumeFileName(profile.name));
    app.emailedAt = new Date().toISOString();
    await saveApplication(app);
  } catch (e) {
    app.error = e instanceof Error ? e.message : String(e);
    await step("failed");
    await addNotification({ userId, kind: "failed", applicationId: id, title: `Could not prepare ${app.job?.company || "application"}`, body: app.error });
    console.error(`application ${id} failed:`, e);
  }
}
