import { requireUserId } from "@/lib/auth";
import { getProfile } from "@/lib/store";
import { importResumeAction } from "../../actions";
import { ProfileEditor } from "@/components/profile-editor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; imported?: string; welcome?: string }> }) {
  const uid = await requireUserId();
  const { error, saved, imported, welcome } = await searchParams;
  const profile = await getProfile(uid);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif text-4xl">{welcome && !profile ? "Welcome. Start with your resume." : "Profile"}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Your profile is the only source of facts for every tailored resume. Nothing that is not here can appear in an application. Upload your current resume to build it, then edit anything.</p>
      </div>
      <section className="panel p-5">
        <form action={importResumeAction} className="flex flex-col gap-3 md:flex-row md:items-center">
          <input type="file" name="resume" accept=".pdf,.txt,.md" required className="field file:mr-3 file:rounded file:border-0 file:bg-tint file:px-3 file:py-1 file:text-sm" />
          <button className="btn-primary">{profile ? "Replace from a new resume" : "Build my profile"}</button>
        </form>
        <p className="mt-2 text-xs text-muted">PDF or plain text. Reading and structuring takes about a minute.{error === "file" && <span className="text-danger"> Choose a file first.</span>}{error === "empty" && <span className="text-danger"> That file had no readable text. Try a text-based PDF.</span>}{error && !["file", "empty"].includes(error) && <span className="text-danger"> {decodeURIComponent(error)}</span>}</p>
        {imported && <p className="mt-2 text-sm text-go">Profile built. Check every section below, then save.</p>}
        {saved && <p className="mt-2 text-sm text-go">Saved.</p>}
      </section>
      {profile ? <ProfileEditor initial={profile} /> : <section className="panel px-6 py-14 text-center text-sm text-muted">No profile yet.</section>}
    </div>
  );
}
