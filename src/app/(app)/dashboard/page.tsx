import Link from "next/link";
import { Upload } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { listApplications, getProfile, getSettings, saveApplication } from "@/lib/store";
import { Settings } from "@/lib/profile/types";
import { refreshAnswers, withProfileFallback } from "@/lib/apply/answers";
import { markStale } from "@/lib/apply/stale";
import { summarize, openQuestions } from "@/lib/stats";
import { createApplicationAction, approveAllAction, submitAllAction } from "../../actions";
import { ActionButton } from "@/components/action-button";
import { StatusBadge, StageTrack } from "@/components/status";
import { LinkInput } from "@/components/link-input";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const uid = await requireUserId();
  const { error } = await searchParams;
  const [apps, profile, settings] = await Promise.all([listApplications(uid), getProfile(uid), getSettings(uid)]);
  const known = withProfileFallback(Settings.parse(settings ?? {}), profile);
  await Promise.all(apps.filter((a) => markStale(a)).map((a) => saveApplication(a)));
  for (const a of apps) refreshAnswers(a, known);
  const s = summarize(apps);
  const counts: { label: string; n: number; tone: string }[] = [
    { label: "awaiting your Submit", n: s.awaitingSubmit, tone: "bg-signal" },
    { label: "need your details", n: s.needsDetails, tone: "bg-signal" },
    { label: "ready to approve", n: s.readyToApprove, tone: "bg-go" },
    { label: "in progress", n: s.inProgress, tone: "bg-accent" },
    { label: "submitted", n: s.submitted, tone: "bg-go" },
    { label: "failed", n: s.failed + s.unsupported, tone: "bg-danger" }
  ];
  return (
    <div className="space-y-8">
      <PageHeader title="Applications" description={apps.length ? "Newest first. Open one to review the resume, answer what is open, and approve." : "Paste a job link and Auto Apply prepares the whole application for your review."} />

      {profile ? (
        <section className="relative">
          <div className="glow pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10 opacity-60" aria-hidden />
          <form action={createApplicationAction} className="panel lift flex flex-col gap-2 p-2 md:flex-row">
            <LinkInput large />
            <SubmitButton pending="Starting" className="btn-primary h-12 px-5">Prepare application</SubmitButton>
          </form>
          <p className="mt-2.5 px-1 text-[13px] text-muted">{error === "url" ? <span className="text-danger">That was not a link. Paste the full job URL, starting with https.</span> : "You get an email and a notification here when the resume is ready, usually within a minute."}</p>
        </section>
      ) : (
        <section className="panel-pad flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-[16px] font-semibold">First, build your profile</h2><p className="mt-1 text-[13.5px] text-muted">Upload your current resume once. Every tailored resume is written only from what it contains.</p></div>
          <Link href="/profile#import" className="btn-primary"><Upload size={15} /> Upload resume</Link>
        </section>
      )}

      {apps.length > 0 && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            {counts.map((c) => (
              <li key={c.label} className={`flex items-center gap-2 ${c.n ? "text-fg" : "text-faint"}`}><span className={`h-1.5 w-1.5 rounded-full ${c.n ? c.tone : "bg-line-strong"}`} /><span className="font-semibold tabular-nums">{c.n}</span> {c.label}</li>
            ))}
          </ul>
          {(s.readyToApprove > 0 || s.awaitingSubmit > 0) && (
            <div className="flex flex-wrap gap-2">
              {s.readyToApprove > 0 && <ActionButton action={approveAllAction} id="all" pending="Approving" className="btn-ghost h-9">Approve all ready ({s.readyToApprove})</ActionButton>}
              {s.awaitingSubmit > 0 && <ActionButton action={submitAllAction} id="all" pending="Requesting" className="btn-primary h-9">Submit all filled ({s.awaitingSubmit})</ActionButton>}
            </div>
          )}
        </div>
      )}

      <section>
        {apps.length === 0 ? (
          <div className="panel px-6 py-16 text-center">
            <div className="mx-auto max-w-sm"><StageTrack status="queued" needsDetails={false} /><p className="mt-5 text-[13.5px] leading-relaxed text-muted">Your applications appear here, each moving along this rail: read, resume, answers, filled, submitted.</p></div>
          </div>
        ) : (
          <ul className="panel divide-rows overflow-hidden">
            {apps.map((a) => {
              const open = openQuestions(a).length;
              const date = new Date(a.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
              return (
                <li key={a.id}>
                  <Link href={`/a/${a.id}`} className="grid gap-3 px-5 py-4 transition-colors hover:bg-surface-2/50 md:grid-cols-[1fr_auto_auto] md:items-center md:gap-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><span className="truncate text-[14.5px] font-medium">{a.job ? `${a.job.company}, ${a.job.title}` : a.url}</span></div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-muted">
                        {a.job?.location && <span className="truncate">{a.job.location}</span>}
                        {a.job && <span className="capitalize">{a.job.board}</span>}
                        <span>{date}</span>
                        {a.match && a.resume && (
                          <span className={`tabular-nums ${a.match.tailored > a.match.profile ? "text-go" : a.match.tailored < a.match.profile ? "text-signal" : ""}`} title="Keyword match with the posting: your full profile vs the tailored resume">
                            Match {a.match.profile}% <span aria-hidden>→</span><span className="sr-only">to</span> {a.match.tailored}%
                          </span>
                        )}
                        {open > 0 && a.status === "ready" && <span className="text-signal">{open} question{open > 1 ? "s need" : " needs"} you</span>}
                        {a.status === "code_required" && !a.verificationCode && <span className="text-signal">Enter the code Greenhouse emailed you</span>}
                        {a.error && ["failed", "unsupported"].includes(a.status) && <span className="truncate text-danger">{a.error.slice(0, 80)}</span>}
                      </div>
                    </div>
                    <StageTrack status={a.status} needsDetails={open > 0} compact />
                    <StatusBadge status={a.status} />
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
