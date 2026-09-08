import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { listApplications, getProfile } from "@/lib/store";
import { summarize, openQuestions } from "@/lib/stats";
import { createApplicationAction } from "../../actions";
import { StatusBadge, StageTrack } from "@/components/status";
import { LinkInput } from "@/components/link-input";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const uid = await requireUserId();
  const { error } = await searchParams;
  const [apps, profile] = await Promise.all([listApplications(uid), getProfile(uid)]);
  const s = summarize(apps);
  const stats: [string, number, string][] = [["Submitted", s.submitted, "text-go"], ["Awaiting your Submit", s.awaitingSubmit, "text-signal"], ["Need your details", s.needsDetails, "text-signal"], ["Ready to approve", s.readyToApprove, "text-ink"], ["In progress", s.inProgress, "text-ink"], ["Failed", s.failed + s.unsupported, "text-danger"]];
  return (
    <div className="space-y-10">
      <section>
        <h1 className="serif text-4xl">Applications</h1>
        <dl className="mt-6 grid grid-cols-3 gap-y-6 border-y border-line py-5 md:grid-cols-6">
          {stats.map(([label, n, tone]) => (
            <div key={label}><dd className={`serif text-4xl leading-none ${n ? tone : "text-line"}`}>{n}</dd><dt className="mt-2 text-xs text-muted">{label}</dt></div>
          ))}
        </dl>
      </section>

      <section className="panel p-5">
        <form action={createApplicationAction} className="flex flex-col gap-3 md:flex-row">
          <LinkInput disabled={!profile} />
          <button className="btn-primary" disabled={!profile}>Prepare application</button>
        </form>
        <p className="mt-2 text-xs text-muted">{profile ? "Greenhouse, Lever and Ashby links work. You'll get an email when the resume is ready." : "Upload your resume on the Profile page first."}{error === "url" && <span className="text-danger"> That was not a URL.</span>}</p>
      </section>

      <section>
        {apps.length === 0 ? (
          <div className="panel px-6 py-14 text-center text-sm text-muted">No applications yet. Paste your first job link above.</div>
        ) : (
          <ul className="panel divide-y divide-line">
            {apps.map((a) => {
              const open = openQuestions(a).length;
              return (
                <li key={a.id}>
                  <Link href={`/a/${a.id}`} className="grid gap-3 px-5 py-4 hover:bg-tint/50 md:grid-cols-[1fr_auto_auto] md:items-center">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{a.job ? `${a.job.company}: ${a.job.title}` : a.url}</div>
                      <div className="mt-0.5 truncate text-xs text-muted">{a.job?.location || a.job?.board || ""}{open > 0 && a.status === "ready" ? <span className="text-signal"> · {open} question{open > 1 ? "s" : ""} need you</span> : null}{a.error && a.status === "failed" ? <span className="text-danger"> · {a.error.slice(0, 80)}</span> : null}</div>
                    </div>
                    <StageTrack status={a.status} needsDetails={open > 0} compact />
                    <div className="flex items-center gap-3 md:justify-end"><StatusBadge status={a.status} /><span className="text-xs text-muted">{new Date(a.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
