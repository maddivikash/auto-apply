import { notFound, redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { getApplication, getProfile, getSettings, saveApplication } from "@/lib/store";
import { Settings } from "@/lib/profile/types";
import { fetchJob } from "@/lib/jobs/fetch";
import { resumeProfileFor } from "@/lib/apply/pipeline";
import { LABEL } from "@/components/status";
import { ResumeEditor } from "@/components/resume-editor";
import { rewriteBulletAction, saveResumeEditAction } from "../../../../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function EditResumePage({ params }: { params: Promise<{ id: string }> }) {
  const uid = await requireUserId();
  const { id } = await params;
  const [app, profile, settings] = await Promise.all([getApplication(uid, id), getProfile(uid), getSettings(uid)]);
  if (!app) notFound();
  if (!app.job || !app.resume || !profile) redirect(`/a/${id}`);
  // Applications prepared before the editor kept only a preview of the posting; fetch it once for live scoring.
  if (!app.jobDescription) {
    try { app.jobDescription = (await fetchJob(app.url)).description.slice(0, 20000); await saveApplication(app); }
    catch { /* the posting may be gone; the preview is enough to score against */ }
  }
  const jd = app.jobDescription || app.job.descriptionPreview;
  const template = app.template ?? Settings.parse(settings ?? {}).resumeTemplate;
  const locked = ["ready", "approved", "failed", "filled"].includes(app.status) ? undefined : `Editing is read-only while the application is ${LABEL[app.status].toLowerCase()}.`;
  return (
    <ResumeEditor
      id={app.id}
      title={`${app.job.company}, ${app.job.title}`}
      initial={app.resume}
      profile={profile}
      renderProfile={resumeProfileFor(profile, app.job.title, jd)}
      template={template}
      jd={jd}
      company={app.job.company}
      rewrite={rewriteBulletAction}
      save={saveResumeEditAction}
      locked={locked}
    />
  );
}
