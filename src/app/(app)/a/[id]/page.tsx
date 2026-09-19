import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Camera } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { fileHref, getApplication, getProfile, getSettings, saveApplication, type Application, type QuestionState } from "@/lib/store";
import { Settings } from "@/lib/profile/types";
import { refreshAnswers, withProfileFallback } from "@/lib/apply/answers";
import { markStale } from "@/lib/apply/stale";
import { openQuestions } from "@/lib/stats";
import { approveAction, deleteAction, reprocessAction, requestSubmitAction, saveAnswersAction, submitCodeAction, markSubmittedAction, requestNewCodeAction, chooseResumeAction, acceptDraftsAction, redraftAction } from "../../../actions";
import { RedraftPanel } from "@/components/redraft-panel";
import { IN_PROGRESS, LABEL, StatusBadge, StageTrack } from "@/components/status";
import { AutoRefresh } from "@/components/auto-refresh";
import { SubmitButton } from "@/components/submit-button";
import { ActionButton } from "@/components/action-button";
import { RegeneratePanel } from "@/components/regenerate-panel";
import { CodeForm } from "@/components/code-form";
import { ResumeToggle } from "@/components/resume-toggle";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ApplicationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const uid = await requireUserId();
  const { id } = await params;
  const { saved } = await searchParams;
  const [app, settings, profile] = await Promise.all([getApplication(uid, id), getSettings(uid), getProfile(uid)]);
  if (!app) notFound();
  if (markStale(app)) await saveApplication(app);
  // Answers follow the current Profile and Answers pages, not the moment the link was pasted.
  if (refreshAnswers(app, withProfileFallback(Settings.parse(settings ?? {}), profile)) && app.status === "ready") await saveApplication(app);
  const waitingForCode = app.status === "code_required" && !app.verificationCode;
  const busy = IN_PROGRESS.includes(app.status) || (app.status === "code_required" && !!app.verificationCode);
  // Regenerate is allowed while merely approved (approval is cleared); blocked only while a step is actually running.
  const processing = ["queued", "fetching", "tailoring", "rendering", "filling", "submit_requested"].includes(app.status) || (app.status === "code_required" && !!app.verificationCode);
  const open = openQuestions(app);
  const answered = app.questions.filter((q) => !open.includes(q) && q.type !== "file");
  const files = app.questions.filter((q) => q.type === "file");
  const blocked = open.some((q) => q.required);
  const step = app.status === "ready" ? 1 : ["approved", "filling"].includes(app.status) ? 2 : ["filled", "submit_requested", "code_required", "submitted"].includes(app.status) ? 3 : 0;

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={busy ? 5 : 15} />
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg"><ArrowLeft size={14} /> Applications</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em]">{app.job ? `${app.job.company}, ${app.job.title}` : "Reading the job post"}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[13.5px] text-muted">{app.job?.location && <span>{app.job.location}</span>}<a className="inline-flex items-center gap-1 hover:text-fg" href={app.url} target="_blank" rel="noreferrer">Open posting <ArrowUpRight size={13} /></a></p>
          </div>
          <StatusBadge status={app.status} />
        </div>
        <div className="mt-6"><StageTrack status={app.status} needsDetails={open.length > 0} /></div>
      </div>

      {busy && <Notice tone="accent">{LABEL[app.status]}. This page updates on its own. Writing the resume takes about a minute.</Notice>}
      {waitingForCode && (
        <Notice tone="signal">
          <span className="font-medium">Greenhouse emailed you a verification code.</span> Check {settings?.email || profile?.email || "your inbox"} for a message from Greenhouse with an 8-character security code, type it here, and the runner finishes the submit. {app.error && <span className="text-danger">{app.error}</span>}
          <CodeForm id={app.id} action={submitCodeAction} renew={requestNewCodeAction} />
        </Notice>
      )}
      {app.status === "failed" && <Notice tone="danger">{app.error} <div className="mt-2"><ActionButton action={reprocessAction} id={app.id} pending="Starting">Try again</ActionButton></div></Notice>}
      {app.status === "unsupported" && <Notice tone="signal">{app.error} Supported boards: Greenhouse, Lever and Ashby.</Notice>}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {app.match && app.resume && <MatchCard match={app.match} />}
          {app.jdSummary && (
            <section className="panel-pad">
              <h2 className="text-[15px] font-semibold">What they want</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{app.jdSummary}</p>
              {app.fitNotes?.length ? <ul className="mt-4 space-y-2 text-[13.5px]">{app.fitNotes.map((n) => <li key={n} className="flex gap-2.5"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-go" />{n}</li>)}</ul> : null}
            </section>
          )}

          {app.job && (
            <section className="panel">
              <div className="panel-head"><h2 className="text-[15px] font-semibold">Form answers</h2>{app.questions.length > 0 && <span className="text-[12.5px] text-muted">{answered.length} filled, {open.length} open</span>}</div>
              {app.questions.length === 0 ? (
                <p className="px-5 py-4 text-[13.5px] text-muted">{app.job.board === "greenhouse" ? "This form has no extra questions." : "This board does not publish its questions. The runner reads them from the live form and reports anything it cannot answer."}</p>
              ) : (
                <form action={saveAnswersAction}>
                  <input type="hidden" name="id" value={app.id} />
                  {open.length > 0 && (
                    <div className="border-b border-line px-5 py-4">
                      <h3 className="flex items-center gap-2 text-[13px] font-medium text-signal"><span className="h-1.5 w-1.5 rounded-full bg-signal" />Need you</h3>
                      <div className="mt-3 space-y-4">{open.map((q) => <QuestionField key={q.id} q={q} appId={app.id} />)}</div>
                    </div>
                  )}
                  {answered.length > 0 && (
                    <details open={open.length === 0} className="group border-b border-line">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-[13px] text-muted hover:text-fg"><span>Filled from your answers</span><span className="text-[12px] group-open:hidden">Show</span><span className="hidden text-[12px] group-open:inline">Hide</span></summary>
                      <div className="space-y-4 px-5 pb-5">{answered.map((q) => <QuestionField key={q.id} q={q} appId={app.id} />)}</div>
                    </details>
                  )}
                  {files.length > 0 && <ul className="border-b border-line px-5 py-3.5 text-[13px] text-muted">{files.map((q) => <li key={q.id}>{q.label}: {/resume|cv/i.test(q.label) ? "the tailored PDF is attached by the runner." : "optional upload, skipped."}</li>)}</ul>}
                  <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <SubmitButton pending="Saving" className="btn-ghost">Save answers</SubmitButton>
                    {app.questions.some((q) => q.source === "ai" && q.needsHuman) && <><ActionButton action={acceptDraftsAction} id={app.id} pending="Accepting" className="btn-primary h-9">Accept all AI drafts</ActionButton><span className="text-[12.5px] text-muted">Saving also confirms the drafts as shown.</span></>}
                    {saved && <span className="text-[13px] text-go">Saved.</span>}
                  </div>
                </form>
              )}
            </section>
          )}

          {app.job && !["unsupported", "failed"].includes(app.status) && (
            <section className="panel">
              <div className="panel-head"><h2 className="text-[15px] font-semibold">Submission</h2></div>
              <ol className="divide-rows">
                <Step n={1} title="Approve" state={step === 1 ? "current" : step > 1 ? "done" : "later"} body="The runner on your machine then fills the form without submitting.">
                  {app.status === "ready" && <div className="mt-3 flex flex-wrap items-center gap-3"><ActionButton action={approveAction} id={app.id} pending="Approving" className="btn-go">Approve for filling</ActionButton>{blocked && <span className="text-[12.5px] text-signal">Answer the required questions first.</span>}</div>}
                </Step>
                <Step n={2} title="The runner fills the form" state={step === 2 ? "current" : step > 2 ? "done" : "later"} body="It types every answer, attaches the PDF and leaves a screenshot.">
                  {["approved", "filling"].includes(app.status) && <p className="mt-2 text-[12.5px] text-muted">Not running? Start it with <code className="kbd">npm run runner</code>.</p>}
                  {app.filledScreenshotUrl && <a className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline" href={fileHref(app.id, "screenshot", app.filledScreenshotUrl)} target="_blank" rel="noreferrer"><Camera size={14} /> View the screenshot</a>}
                  {app.runnerNotes?.length ? <ul className="mt-3 space-y-1 text-[12.5px] text-muted">{app.runnerNotes.slice(-6).map((n, i) => <li key={i} className="mono break-words whitespace-pre-wrap">{n}</li>)}</ul> : null}
                </Step>
                <Step n={3} title="You press Submit" state={app.status === "submitted" ? "done" : step === 3 ? "current" : "later"} body="Nothing is sent before this.">
                  {app.status === "filled" && <div className="mt-3"><ActionButton action={requestSubmitAction} id={app.id} pending="Submitting" className="btn-go">Submit application</ActionButton></div>}
                  {app.status === "code_required" && <p className="mt-2 text-[12.5px] text-muted">{app.verificationCode ? "Code received. The runner is entering it." : "Waiting for the verification code above."}</p>}
                  {["filled", "submit_requested", "code_required"].includes(app.status) && (
                    <p className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">Finished it yourself in the runner&apos;s browser window? <ActionButton action={markSubmittedAction} id={app.id} pending="Saving" className="btn-quiet h-7 px-2 text-[12.5px] underline underline-offset-2">Mark as submitted</ActionButton></p>
                  )}
                  {app.status === "submitted" && <p className="mt-2 text-[13px] text-go">Submitted {app.submittedAt && new Date(app.submittedAt).toLocaleString()}.</p>}
                </Step>
              </ol>
            </section>
          )}
          <form action={deleteAction} className="text-right"><input type="hidden" name="id" value={app.id} /><button className="text-[12.5px] text-faint hover:text-danger">Delete this application</button></form>
        </div>

        <div className="min-w-0 space-y-4 lg:sticky lg:top-8 lg:self-start">
          {app.resumePdfUrl ? (
            <section className="panel overflow-hidden">
              <div className="panel-head">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-[15px] font-semibold">{app.resumeChoice === "full" ? "Original resume" : "Tailored resume"}</span>{app.variants && <ResumeToggle id={app.id} choice={app.resumeChoice || "tailored"} tailored={app.variants.tailored.match.tailored} full={app.variants.full.match.tailored} locked={!["ready", "approved"].includes(app.status)} action={chooseResumeAction} />}</div>
                  <div className="truncate text-[12.5px] text-muted">{app.headline}{app.trims?.length ? `. Trimmed to fit: ${app.trims.join(", ")}` : ""}</div>
                </div>
                <div className="flex gap-2"><a href={`/api/applications/${app.id}/pdf`} target="_blank" rel="noreferrer" className="btn-ghost h-8">Open PDF</a><RegeneratePanel id={app.id} action={reprocessAction} disabled={processing} lastNotes={app.revisionNotes} /></div>
              </div>
              {app.resumeWarnings?.length ? <p className="border-b border-line bg-signal-soft px-5 py-2 text-[12.5px] text-signal">Checks flagged: {app.resumeWarnings.join("; ")}</p> : null}
              <object data={`/api/applications/${app.id}/pdf#toolbar=0&view=FitH`} type="application/pdf" className="aspect-[17/22] w-full bg-surface-2" aria-label="Resume preview"><div className="flex h-full items-center justify-center text-[13px] text-muted">Preview not available in this browser. <a className="ml-1 underline" href={`/api/applications/${app.id}/pdf`} target="_blank" rel="noreferrer">Open the PDF</a></div></object>
            </section>
          ) : (
            <section className="panel flex h-64 items-center justify-center text-[13.5px] text-muted">{busy ? "The resume preview appears here when it is ready." : "No resume yet."}</section>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: NonNullable<Application["match"]> }) {
  const delta = match.tailored - match.profile;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <section className="panel-pad">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold">Match with this job</h2>
          <p className="mt-1 text-[12.5px] text-muted">Keyword match, the way an applicant tracking system reads it. Not a hiring prediction.</p>
          <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-muted"><span className="text-fg">Fit, not overfit.</span> The resume selects and orders your real work; it does not rewrite it in the posting&apos;s words. Recruiters notice resumes that echo the ad, so a moderate score with true content beats a high one that reads like the job description.</p>
        </div>
        <div className="flex items-baseline gap-3 tabular-nums">
          <span className="text-[32px] font-semibold leading-none">{match.tailored}</span>
          <span className="text-[13px] text-muted">was {match.profile} with your full profile</span>
          {delta !== 0 && <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${delta > 0 ? "bg-go-soft text-go" : "bg-signal-soft text-signal"}`}>{delta > 0 ? "+" : ""}{delta}</span>}
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
        <Meter label="Job terms covered" value={match.coverage} hint={pct(match.coverage)} />
        <Meter label="Resume lines that speak to this job" value={match.focus} hint={pct(match.focus)} />
      </div>
      {match.matched.length > 0 && <p className="mt-4 text-[12.5px] text-muted">Matched: {match.matched.join(", ")}.</p>}
      {match.missing.length > 0 && <p className="mt-1.5 text-[12.5px] text-muted">Not found: <span className="text-fg">{match.missing.join(", ")}</span>. Add any of these to your profile only if they are genuinely true of you; the resume will pick them up on the next regenerate.</p>}
    </section>
  );
}

function Meter({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div>
      <div className="flex justify-between text-[12.5px]"><span className="text-muted">{label}</span><span className="tabular-nums">{hint}</span></div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}><div className="h-full rounded-full bg-fg" style={{ width: `${Math.round(value * 100)}%` }} /></div>
    </div>
  );
}

function Notice({ tone, children }: { tone: "accent" | "danger" | "signal"; children: React.ReactNode }) {
  const cls = { accent: "bg-accent-soft text-fg", danger: "bg-danger-soft text-danger", signal: "bg-signal-soft text-signal" }[tone];
  return <div className={`rounded-[var(--radius-ctl)] px-4 py-3 text-[13.5px] leading-relaxed ${cls}`}>{children}</div>;
}

function Step({ n, title, state, body, children }: { n: number; title: string; state: "done" | "current" | "later"; body: string; children?: React.ReactNode }) {
  const dot = state === "done" ? "bg-go text-white" : state === "current" ? "bg-fg text-bg" : "bg-surface-2 text-faint";
  return (
    <li className={`flex gap-4 px-5 py-4 ${state === "later" ? "opacity-60" : ""}`}>
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${dot}`}>{n}</span>
      <div className="min-w-0 flex-1"><div className="text-[14px] font-medium">{title}</div><p className="mt-0.5 text-[13px] text-muted">{body}</p>{children}</div>
    </li>
  );
}

function QuestionField({ q, appId }: { q: QuestionState; appId: string }) {
  const name = `q:${q.id}`;
  const redraft = q.source === "ai" || (q.type === "textarea" && !q.answer && q.needsHuman) ? <RedraftPanel id={appId} questionId={q.id} action={redraftAction} /> : null;
  const label = <label htmlFor={name} className="flex flex-wrap items-baseline gap-x-2 text-[13px] font-medium">{q.label}{q.required && (!q.answer || q.needsHuman) && <span className="text-danger">required</span>}{q.source === "user" && q.answer && <span className="text-[11.5px] font-normal text-faint">you answered</span>}{q.source === "ai" && q.answer && <span className={`rounded-full px-1.5 py-[1px] text-[11px] font-medium ${q.needsHuman ? "bg-signal-soft text-signal" : "bg-accent-soft text-accent"}`}>{q.needsHuman ? "AI draft from your profile, needs your confirmation" : "AI draft, accepted"}</span>}{q.source && q.source !== "user" && q.source !== "ai" && <span className="text-[11.5px] font-normal text-faint">from your answers</span>}</label>;
  if (q.type === "file") return null;
  if (q.options?.length) return <div>{label}<select id={name} name={name} defaultValue={q.answer || ""} className="field mt-1.5"><option value="">Choose</option>{q.options.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>;
  if (q.type === "textarea" || q.needsHuman || q.source === "ai") return <div>{label}<textarea key={q.answer || ""} id={name} name={name} defaultValue={q.answer || ""} rows={q.source === "ai" ? 5 : 3} className="field mt-1.5" />{redraft}</div>;
  return <div>{label}<input id={name} name={name} defaultValue={q.answer || ""} className="field mono mt-1.5 text-[13px]" /></div>;
}
