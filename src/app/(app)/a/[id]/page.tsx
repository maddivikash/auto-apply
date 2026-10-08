import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Camera, Check, PenLine, Upload } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { fileHref, getApplication, getProfile, getSettings, saveApplication, type Application, type QuestionState } from "@/lib/store";
import { Settings } from "@/lib/profile/types";
import { refreshAnswers, withProfileFallback } from "@/lib/apply/answers";
import { markStale } from "@/lib/apply/stale";
import { openQuestions } from "@/lib/stats";
import { approveAction, deleteAction, reprocessAction, requestSubmitAction, saveAnswersAction, submitCodeAction, markSubmittedAction, requestNewCodeAction, chooseResumeAction, acceptDraftsAction, redraftAction, applyTemplateAction } from "../../../actions";
import { TemplateSwitch } from "@/components/template-switch";
import { ResumeFrame } from "@/components/resume-frame";
import { resumeHtml } from "@/lib/resume/templates";
import { resumeProfileFor } from "@/lib/apply/pipeline";
import { RedraftPanel } from "@/components/redraft-panel";
import { IN_PROGRESS, LABEL, StatusBadge, StageTrack } from "@/components/status";
import { AutoRefresh } from "@/components/auto-refresh";
import { SubmitButton } from "@/components/submit-button";
import { ActionButton } from "@/components/action-button";
import { RegeneratePanel } from "@/components/regenerate-panel";
import { CodeForm } from "@/components/code-form";
import { ResumeToggle } from "@/components/resume-toggle";
import { RequiredTag } from "@/components/required-tag";
import { getBank } from "@/lib/apply/bank";
import { repairMatches } from "@/lib/apply/match-repair";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ApplicationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const uid = await requireUserId();
  const { id } = await params;
  const { saved } = await searchParams;
  const [app, settings, profile, bank] = await Promise.all([getApplication(uid, id), getSettings(uid), getProfile(uid), getBank(uid)]);
  if (!app) notFound();
  if (markStale(app)) await saveApplication(app);
  if (profile && (await repairMatches(app, profile))) await saveApplication(app);
  // Answers follow the current Profile and Answers pages, not the moment the link was pasted.
  if (refreshAnswers(app, withProfileFallback(Settings.parse(settings ?? {}), profile), bank) && app.status === "ready") await saveApplication(app);
  const waitingForCode = app.status === "code_required" && !app.verificationCode;
  const busy = IN_PROGRESS.includes(app.status) || (app.status === "code_required" && !!app.verificationCode);
  // Filling, submitting and entering the code happen in the local runner; nothing moves if it is not running.
  const needsRunner = ["approved", "filling", "submit_requested", "code_required"].includes(app.status);
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
            <h1 className="text-[28px] font-medium leading-tight tracking-[-0.03em]">{app.job ? `${app.job.company}, ${app.job.title}` : busy ? "Reading the job post" : "Could not prepare this one"}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[13.5px] text-muted">{app.job?.location && <span>{app.job.location}</span>}<a className="inline-flex items-center gap-1 hover:text-fg" href={app.url} target="_blank" rel="noreferrer">Open posting <ArrowUpRight size={13} /></a></p>
          </div>
          {/* The next thing to do sits at the top, not only in the Submission steps at the bottom. */}
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge status={app.status} />
            {app.status === "ready" && open.length > 0 && <a href="#answers" className="btn-ghost h-9">Answer {open.length} question{open.length > 1 ? "s" : ""}</a>}
            {app.status === "ready" && !blocked && <ActionButton action={approveAction} id={app.id} pending="Approving" className="btn-go h-9">Approve for filling</ActionButton>}
            {app.status === "filled" && <ActionButton action={requestSubmitAction} id={app.id} pending="Submitting" className="btn-go h-9">{app.error ? "Submit again" : "Submit application"}</ActionButton>}
            {app.status === "code_required" && !app.verificationCode && <a href="#top-code" className="btn-primary h-9">Enter the email code</a>}
            {["approved", "filling"].includes(app.status) && <span className="text-[12.5px] text-muted">The runner is filling the form</span>}
          </div>
        </div>
        <div className="mt-6"><StageTrack status={app.status} needsDetails={open.length > 0} /></div>
      </div>

      {/* A Submit that did not go through comes back as "filled" with the reason; say so plainly at the top. */}
      {app.status === "filled" && app.error && (
        <Notice tone="danger"><span className="font-medium">The last Submit did not go through.</span> {app.error.replace(/\s+/g, " ").slice(0, 400)} <span className="text-fg">Fix anything listed, then press Submit again.</span></Notice>
      )}
      {busy && (needsRunner
        ? <Notice tone="accent">{LABEL[app.status]}. This step runs on your computer, so the runner must be running: start it with <code className="kbd">npx lazy-apply</code> and leave its window open. First time? <Link href="/runner" className="text-accent hover:underline">Set up the runner</Link>. This page updates on its own.</Notice>
        : <Notice tone="accent">{LABEL[app.status]}. This page updates on its own. Writing the resume takes about a minute, and the runner is not needed until you approve.</Notice>)}
      {waitingForCode && (
        <div id="top-code" className="scroll-mt-6"><Notice tone="signal">
          <span className="font-medium">Greenhouse emailed you a verification code.</span> Check {settings?.email || profile?.email || "your inbox"} for a message from Greenhouse with an 8-character security code, type it here, and the runner finishes the submit. {app.error && <span className="text-danger">{app.error}</span>}
          <CodeForm id={app.id} action={submitCodeAction} renew={requestNewCodeAction} />
        </Notice></div>
      )}
      {app.status === "failed" && <Notice tone="danger">{app.error} <div className="mt-3 flex flex-wrap gap-2">{!profile && <Link href="/profile?welcome=1" className="btn-primary h-9"><Upload size={15} /> Upload resume</Link>}<ActionButton action={reprocessAction} id={app.id} pending="Starting" className={profile ? "btn-ghost h-8" : "btn-ghost h-9"}>Try again</ActionButton></div></Notice>}
      {app.status === "unsupported" && <Notice tone="signal">{app.error} Supported boards: Greenhouse, Lever and Ashby.</Notice>}

      {!app.job ? (
        <section className="panel flex flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="max-w-sm text-[13.5px] leading-relaxed text-muted">{busy ? "Reading the posting. The resume, the form answers and the preview appear here as each step finishes." : "Nothing was prepared for this link yet. Fix what the message above says, then try again, or remove it."}</p>
          {!busy && <form action={deleteAction}><input type="hidden" name="id" value={app.id} /><button className="text-[12.5px] text-faint hover:text-danger">Delete this application</button></form>}
        </section>
      ) : (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {app.match && app.resume && (app.match.unscored
            ? <section className="panel-pad"><h2 className="text-[13px] text-muted">Job match</h2><div className="mt-2 text-[44px] font-medium leading-none tracking-[-0.04em]">—</div><p className="mt-3 text-[13px] leading-relaxed text-muted">This posting was taken down before its full text was saved, so the match cannot be calculated. The resume itself is unaffected.</p></section>
            : <MatchCard match={app.match} />)}
          {app.jdSummary && (
            <section className="panel-pad">
              <h2 className="text-[15px] font-semibold">What they want</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{app.jdSummary}</p>
              {app.fitNotes?.length ? <ul className="mt-4 space-y-2 text-[13.5px]">{app.fitNotes.map((n) => <li key={n} className="flex gap-2.5"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-go" />{n}</li>)}</ul> : null}
            </section>
          )}

          {app.job && (
            <section id="answers" className="panel scroll-mt-6">
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
                  {["approved", "filling"].includes(app.status) && <p className="mt-2 text-[12.5px] text-muted">Not running? Start it with <code className="kbd">npx lazy-apply</code>, or <Link href="/runner" className="text-accent hover:underline">set it up</Link> first.</p>}
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
                  <div className="flex flex-wrap items-center gap-2"><span className="text-[15px] font-semibold">{app.resumeChoice === "full" ? "Original resume" : "Tailored resume"}</span>{app.variants && <ResumeToggle id={app.id} choice={app.resumeChoice || "tailored"} tailored={app.variants.tailored.match.unscored ? null : app.variants.tailored.match.tailored} full={app.variants.full.match.unscored ? null : app.variants.full.match.tailored} locked={!["ready", "approved"].includes(app.status)} action={chooseResumeAction} />}</div>
                  <div className="truncate text-[12.5px] text-muted">{app.editedAt ? "Edited by you. " : ""}{app.headline}{app.trims?.length ? `. Trimmed to fit: ${app.trims.join(", ")}` : ""}</div>
                </div>
                <div className="flex flex-wrap gap-2">{app.resume && <Link href={`/a/${app.id}/edit`} className="btn-primary h-8"><PenLine size={14} /> Edit resume</Link>}{app.resume && <TemplateSwitch id={app.id} value={app.template ?? Settings.parse(settings ?? {}).resumeTemplate} action={applyTemplateAction} disabled={!["ready", "approved", "failed"].includes(app.status)} />}<a href={`/api/applications/${app.id}/pdf`} target="_blank" rel="noreferrer" className="btn-ghost h-8">Open PDF</a><RegeneratePanel id={app.id} action={reprocessAction} disabled={processing} lastNotes={app.revisionNotes} /></div>
              </div>
              {app.resumeWarnings?.length ? <p className="border-b border-line bg-signal-soft px-5 py-2 text-[12.5px] text-signal">Checks flagged: {app.resumeWarnings.join("; ")}</p> : null}
{/* The same HTML the PDF is printed from, so it shows everywhere (phones and headless browsers have no PDF viewer). */}
              {app.resume && profile && app.job ? <div className="bg-surface-2 p-3"><div className="overflow-hidden rounded-[6px] shadow-[0_1px_2px_rgba(18,24,38,0.08),0_12px_30px_-18px_rgba(18,24,38,0.4)]"><ResumeFrame html={resumeHtml(app.resume, resumeProfileFor(profile, app.job.title, app.jobDescription || app.job.descriptionPreview), app.scale ?? 1, app.template ?? Settings.parse(settings ?? {}).resumeTemplate)} title="Resume preview" fill /></div></div> : null}
            </section>
          ) : (
            <section className="panel flex h-64 items-center justify-center text-[13.5px] text-muted">{busy ? "The resume preview appears here when it is ready." : "No resume yet."}</section>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: NonNullable<Application["match"]> }) {
  const delta = match.tailored - match.profile;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const strength = match.tailored >= 70 ? ["Strong", "bg-go-soft text-go"] : match.tailored >= 50 ? ["Good", "bg-accent-soft text-accent"] : ["Fair", "bg-signal-soft text-signal"];
  return (
    <section className="panel-pad">
      <div className="flex items-center justify-between gap-3"><h2 className="text-[13px] text-muted">Job match</h2><span className={`pill ${strength[1]}`}>{strength[0]}</span></div>
      <div className="mt-2 flex flex-wrap items-baseline gap-3 tabular-nums">
        <span className="text-[44px] font-medium leading-none tracking-[-0.04em]">{match.tailored}%</span>
        <span className="text-[13px] text-muted">was {match.profile}% with your full profile</span>
        {delta !== 0 && <span className={`pill ${delta > 0 ? "bg-go-soft text-go" : "bg-signal-soft text-signal"}`}>{delta > 0 ? "+" : ""}{delta}</span>}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-go" style={{ width: `${match.tailored}%` }} /></div>
      <div className="mt-5 grid gap-3 text-[13px] sm:grid-cols-2">
        <Meter label="Job terms covered" value={match.coverage} hint={pct(match.coverage)} />
        <Meter label="Resume lines that speak to this job" value={match.focus} hint={pct(match.focus)} />
      </div>
      {match.matched.length > 0 && <><div className="eyebrow mt-5 !text-faint">Keywords matched</div><div className="mt-2 flex flex-wrap gap-1.5">{match.matched.map((k) => <span key={k} className="chip bg-go-soft text-go"><Check size={11} strokeWidth={3} />{k}</span>)}</div></>}
      {match.missing.length > 0 && <><div className="eyebrow mt-4 !text-faint">Not found</div><div className="mt-2 flex flex-wrap gap-1.5">{match.missing.map((k) => <span key={k} className="chip border border-dashed border-line-strong text-muted">{k}</span>)}</div></>}
      <p className="mt-4 text-[12.5px] leading-relaxed text-muted"><span className="text-fg">Fit, not overfit.</span> Keyword match the way an applicant tracking system reads it, not a hiring prediction. Add a missing term only if it is genuinely true of you; a moderate score with true content beats a resume that echoes the ad.</p>
    </section>
  );
}

function Meter({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div>
      <div className="flex justify-between text-[12.5px]"><span className="text-muted">{label}</span><span className="tabular-nums">{hint}</span></div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}><div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(value * 100)}%` }} /></div>
    </div>
  );
}

function Notice({ tone, children }: { tone: "accent" | "danger" | "signal"; children: React.ReactNode }) {
  const cls = { accent: "bg-accent-soft text-fg", danger: "bg-danger-soft text-danger", signal: "bg-signal-soft text-signal" }[tone];
  return <div className={`rounded-[var(--radius-ctl)] px-4 py-3 text-[13.5px] leading-relaxed ${cls}`}>{children}</div>;
}

function Step({ n, title, state, body, children }: { n: number; title: string; state: "done" | "current" | "later"; body: string; children?: React.ReactNode }) {
  const dot = state === "done" ? "bg-go text-white" : state === "current" ? "bg-accent text-white" : "bg-surface-2 text-faint";
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
  const label = <label htmlFor={name} className="flex flex-wrap items-baseline gap-x-2 text-[13px] font-medium">{q.label}{q.required && (!q.answer || q.needsHuman) && <RequiredTag htmlFor={name} initiallyEmpty={!q.answer} />}{q.source === "user" && q.answer && <span className="text-[11.5px] font-normal text-faint">you answered</span>}{q.source === "ai" && q.answer && <span className={`rounded-full px-1.5 py-[1px] text-[11px] font-medium ${q.needsHuman ? "bg-signal-soft text-signal" : "bg-accent-soft text-accent"}`}>{q.needsHuman ? "AI draft from your profile, needs your confirmation" : "AI draft, accepted"}</span>}{q.source === "saved" && q.answer && <span className="rounded-full bg-go-soft px-1.5 py-[1px] text-[11px] font-medium text-go">from your saved answers</span>}{(q.source === "profile" || q.source === "rule") && <span className="text-[11.5px] font-normal text-faint">from your answers</span>}</label>;
  if (q.type === "file") return null;
  if (q.options?.length) return <div>{label}<select id={name} name={name} defaultValue={q.answer || ""} className="field mt-1.5"><option value="">Choose</option>{q.options.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>;
  if (q.type === "textarea" || q.needsHuman || q.source === "ai") return <div>{label}<textarea key={q.answer || ""} id={name} name={name} defaultValue={q.answer || ""} rows={q.source === "ai" ? 5 : 3} className="field mt-1.5" />{redraft}</div>;
  return <div>{label}<input id={name} name={name} defaultValue={q.answer || ""} className="field mono mt-1.5 text-[13px]" /></div>;
}
