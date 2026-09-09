import Link from "next/link";
import { ArrowUpRight, Upload } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { listApplications, getProfile } from "@/lib/store";
import { summarize, openQuestions } from "@/lib/stats";
import { createApplicationAction } from "../../actions";
import { StatusBadge, StageTrack } from "@/components/status";
import { LinkInput } from "@/components/link-input";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const uid = await requireUserId();
  const { error } = await searchParams;
  const [apps, profile] = await Promise.all([listApplications(uid), getProfile(uid)]);
  const s = summarize(apps);
  const tiles: { label: string; n: number; bar: string; hint: string }[] = [
    { label: "Awaiting your Submit", n: s.awaitingSubmit, bar: "bg-signal", hint: "Forms filled, one click from done" },
    { label: "Need your details", n: s.needsDetails, bar: "bg-signal", hint: "Questions only you can answer" },
    { label: "Ready to approve", n: s.readyToApprove, bar: "bg-go", hint: "Resume and answers complete" },
    { label: "In progress", n: s.inProgress, bar: "bg-brand", hint: "Reading, writing or filling" },
    { label: "Submitted", n: s.submitted, bar: "bg-go", hint: "All time" },
    { label: "Failed", n: s.failed + s.unsupported, bar: "bg-danger", hint: "Open one to retry" }
  ];
  return (
    <div className="space-y-10">
      <PageHeader title="Applications" description={apps.length ? `${apps.length} application${apps.length > 1 ? "s" : ""}, newest first.` : "Paste a job link and Auto Apply prepares the whole application for your review."} />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="panel overflow-hidden">
            <div className={`h-1 ${t.n ? t.bar : "bg-line"}`} />
            <div className="p-4"><div className={`serif text-4xl leading-none ${t.n ? "text-ink" : "text-line"}`}>{t.n}</div><div className="mt-2 text-sm font-medium">{t.label}</div><div className="mt-0.5 text-xs text-muted">{t.hint}</div></div>
          </div>
        ))}
      </section>

      {profile ? (
        <section className="panel-pad">
          <form action={createApplicationAction} className="flex flex-col gap-3 md:flex-row">
            <LinkInput />
            <SubmitButton pending="Starting...">Prepare application</SubmitButton>
          </form>
          <p className="mt-3 text-sm text-muted">Greenhouse, Lever and Ashby links work. You get an email when the resume is ready.{error === "url" && <span className="text-danger"> That was not a URL.</span>}</p>
        </section>
      ) : (
        <section className="panel-pad flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-lg font-medium">First, build your profile</h2><p className="mt-1 text-sm text-muted">Upload your current resume once. Every tailored resume is written only from what it contains.</p></div>
          <Link href="/profile#import" className="btn-primary"><Upload size={16} /> Upload resume</Link>
        </section>
      )}

      <section className="space-y-3">
        {apps.length === 0 ? (
          <div className="panel px-6 py-16 text-center"><div className="mx-auto max-w-sm"><StageTrack status="queued" needsDetails={false} /><p className="mt-4 text-sm text-muted">Your applications will appear here, each moving through five stages: read, resume, answers, filled, submitted.</p></div></div>
        ) : apps.map((a) => {
          const open = openQuestions(a).length;
          return (
            <Link key={a.id} href={`/a/${a.id}`} className="panel block px-5 py-4 transition-colors hover:border-ink/30">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium"><span className="truncate">{a.job ? `${a.job.company}: ${a.job.title}` : a.url}</span><ArrowUpRight size={14} className="shrink-0 text-muted" /></div>
                  <div className="mt-0.5 text-sm text-muted">{a.job?.location || ""}{a.job ? ` · ${a.job.board}` : ""} · {new Date(a.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <StageTrack status={a.status} needsDetails={open > 0} />
                {open > 0 && a.status === "ready" ? <span className="text-sm text-signal">{open} question{open > 1 ? "s" : ""} need you</span> : a.error && ["failed", "unsupported"].includes(a.status) ? <span className="truncate text-sm text-danger">{a.error.slice(0, 90)}</span> : null}
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
