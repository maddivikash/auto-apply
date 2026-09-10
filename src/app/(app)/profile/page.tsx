import { FileUp } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getProfile } from "@/lib/store";
import { importResumeAction } from "../../actions";
import { ProfileEditor } from "@/components/profile-editor";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; imported?: string; welcome?: string }> }) {
  const uid = await requireUserId();
  const { error, saved, imported, welcome } = await searchParams;
  const profile = await getProfile(uid);
  const errorText = error === "file" ? "Choose a file first." : error === "empty" ? "That file had no readable text. Try a text-based PDF." : error ? decodeURIComponent(error) : null;
  return (
    <div className="space-y-8">
      <PageHeader title={welcome && !profile ? "Welcome. Start with your resume." : "Profile"} description="The only source of facts for every tailored resume. Nothing that is not here can appear in an application. Upload your current resume to build it, then edit anything." />
      <section id="import" className={`panel-pad ${!profile ? "border-dashed" : ""}`}>
        <form action={importResumeAction} className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-[var(--radius-ctl)] border border-line bg-surface-2/60 px-3 py-2 text-[13.5px] text-muted hover:border-line-strong">
            <FileUp size={16} className="shrink-0 text-faint" />
            <input type="file" name="resume" accept=".pdf,.txt,.md" required className="flex-1 text-fg file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-2.5 file:py-1 file:text-[12.5px] file:font-medium file:text-fg" />
          </label>
          <SubmitButton pending="Reading your resume, about a minute">{profile ? "Replace from a new resume" : "Build my profile"}</SubmitButton>
        </form>
        <p className="mt-2.5 text-[12.5px] text-muted">PDF or plain text. Reading and structuring takes about a minute.</p>
        {errorText && <p className="mt-2 text-[13px] text-danger">{errorText}</p>}
        {imported && <p className="mt-2 text-[13px] text-go">Profile built. Check every section below, then save.</p>}
        {saved && <p className="mt-2 text-[13px] text-go">Saved.</p>}
      </section>
      {profile ? <ProfileEditor initial={profile} /> : <section className="panel px-6 py-16 text-center text-[13.5px] text-muted">No profile yet. Upload a resume above and every section appears here for editing.</section>}
    </div>
  );
}
