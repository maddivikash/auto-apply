import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { getApplication, type QuestionState } from "@/lib/store";
import { openQuestions } from "@/lib/stats";
import { approveAction, deleteAction, reprocessAction, requestSubmitAction, saveAnswersAction } from "../../../actions";
import { IN_PROGRESS, LABEL, StatusBadge, StageTrack } from "@/components/status";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ApplicationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const uid = await requireUserId();
  const { id } = await params;
  const { saved } = await searchParams;
  const app = await getApplication(uid, id);
  if (!app) notFound();
  const busy = IN_PROGRESS.includes(app.status);
  const open = openQuestions(app);
  const answered = app.questions.filter((q) => !open.includes(q));
  const blocked = open.some((q) => q.required);

  return (
    <div className="space-y-8">
      {busy && <AutoRefresh seconds={5} />}
      <div>
        <Link href="/dashboard" className="text-sm text-muted hover:text-ink">← Applications</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="serif text-3xl leading-tight">{app.job ? `${app.job.company}: ${app.job.title}` : "Reading the job post"}</h1>
            <p className="mt-1 truncate text-sm text-muted">{app.job?.location} <a className="underline" href={app.url} target="_blank" rel="noreferrer">Open posting</a></p>
          </div>
          <StatusBadge status={app.status} />
        </div>
        <div className="mt-5"><StageTrack status={app.status} needsDetails={open.length > 0} /></div>
      </div>

      {busy && <p className="rounded-md bg-tint px-4 py-3 text-sm">{LABEL[app.status]}. This page updates on its own; writing the resume takes about a minute.</p>}
      {app.status === "failed" && <div className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">{app.error} <form action={reprocessAction} className="mt-2 inline"><input type="hidden" name="id" value={app.id} /><button className="underline">Try again</button></form></div>}
      {app.status === "unsupported" && <div className="rounded-md bg-signal-soft px-4 py-3 text-sm text-signal">{app.error} Supported boards: Greenhouse, Lever and Ashby.</div>}

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-8">
          {app.jdSummary && (
            <section className="panel-pad">
              <h2 className="font-medium">What they want</h2>
              <p className="mt-2 text-sm text-muted">{app.jdSummary}</p>
              {app.fitNotes?.length ? <ul className="mt-3 space-y-1.5 text-sm">{app.fitNotes.map((n) => <li key={n} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-go" />{n}</li>)}</ul> : null}
            </section>
          )}

          {app.job && (
            <section className="panel-pad">
              <h2 className="font-medium">Form answers</h2>
              {app.questions.length === 0 ? (
                <p className="mt-2 text-sm text-muted">{app.job.board === "greenhouse" ? "This form has no extra questions." : "This board does not publish its questions. The runner reads them from the live form and reports anything it cannot answer."}</p>
              ) : (
                <form action={saveAnswersAction} className="mt-3 space-y-5">
                  <input type="hidden" name="id" value={app.id} />
                  {open.length > 0 && <div><h3 className="text-sm font-medium text-signal">Need you ({open.length})</h3><div className="mt-2 space-y-3">{open.map((q) => <QuestionField key={q.id} q={q} />)}</div></div>}
                  {answered.length > 0 && <details open={open.length === 0}><summary className="cursor-pointer text-sm text-muted">Answered from your profile ({answered.length})</summary><div className="mt-2 space-y-3">{answered.map((q) => <QuestionField key={q.id} q={q} />)}</div></details>}
                  <div className="flex items-center gap-3"><button className="btn-primary">Save answers</button>{saved && <span className="text-sm text-go">Saved.</span>}</div>
                </form>
              )}
            </section>
          )}

          {app.job && !["unsupported", "failed"].includes(app.status) && (
            <section className="panel-pad">
              <h2 className="font-medium">Submission</h2>
              <ol className="mt-3 space-y-3 text-sm">
                <li className={`rounded-md px-3 py-2 ${app.status === "ready" ? "bg-tint" : ""}`}>
                  <b>1. Approve.</b> The runner on your machine then fills the form without submitting.
                  {app.status === "ready" && <form action={approveAction} className="mt-2"><input type="hidden" name="id" value={app.id} /><button className="btn-go" disabled={blocked}>Approve for filling</button>{blocked && <span className="ml-3 text-xs text-signal">Answer the required questions first.</span>}</form>}
                </li>
                <li className={`rounded-md px-3 py-2 ${["approved", "filling"].includes(app.status) ? "bg-tint" : ""}`}>
                  <b>2. Runner fills the form</b> and takes a screenshot.{["approved", "filling"].includes(app.status) && <span className="text-muted"> Start it with <code className="rounded bg-tint px-1">npm run runner</code> if it is not running.</span>}
                  {app.filledScreenshotUrl && <a className="ml-2 underline" href={app.filledScreenshotUrl} target="_blank" rel="noreferrer">View screenshot</a>}
                  {app.runnerNotes?.length ? <ul className="mt-1 list-disc pl-5 text-xs text-muted">{app.runnerNotes.slice(-6).map((n, i) => <li key={i}>{n}</li>)}</ul> : null}
                </li>
                <li className={`rounded-md px-3 py-2 ${app.status === "filled" ? "bg-signal-soft" : ""}`}>
                  <b>3. You press Submit.</b> Nothing is sent before this.
                  {app.status === "filled" && <form action={requestSubmitAction} className="mt-2"><input type="hidden" name="id" value={app.id} /><button className="btn-go">Submit application</button></form>}
                  {app.status === "submitted" && <span className="ml-2 text-go">Submitted {app.submittedAt && new Date(app.submittedAt).toLocaleString()}.</span>}
                </li>
              </ol>
            </section>
          )}
          <form action={deleteAction} className="text-right"><input type="hidden" name="id" value={app.id} /><button className="text-xs text-muted hover:text-danger">Delete this application</button></form>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {app.resumePdfUrl ? (
            <section className="panel overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <div><div className="font-medium">Tailored resume</div><div className="text-xs text-muted">{app.headline}{app.trims?.length ? ` · trimmed: ${app.trims.join(", ")}` : ""}</div></div>
                <div className="flex gap-2"><a href={`/api/applications/${app.id}/pdf`} target="_blank" rel="noreferrer" className="btn-ghost py-1.5">Open PDF</a><form action={reprocessAction}><input type="hidden" name="id" value={app.id} /><button className="btn-ghost py-1.5" disabled={busy}>Regenerate</button></form></div>
              </div>
              {app.resumeWarnings?.length ? <p className="border-b border-line bg-signal-soft px-4 py-2 text-xs text-signal">Checks flagged: {app.resumeWarnings.join("; ")}</p> : null}
              <object data={`/api/applications/${app.id}/pdf#toolbar=0&view=FitH`} type="application/pdf" className="h-[760px] w-full bg-tint" aria-label="Resume preview"><div className="flex h-full items-center justify-center text-sm text-muted">Preview not available in this browser. <a className="ml-1 underline" href={`/api/applications/${app.id}/pdf`} target="_blank" rel="noreferrer">Open the PDF</a></div></object>
            </section>
          ) : (
            <section className="panel flex h-64 items-center justify-center text-sm text-muted">{busy ? "Resume preview appears here when it is ready." : "No resume yet."}</section>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionField({ q }: { q: QuestionState }) {
  const name = `q:${q.id}`;
  const label = <label htmlFor={name} className="block text-sm font-medium">{q.label}{q.required && <span className="text-danger"> *</span>}{q.source && q.source !== "user" && <span className="ml-2 text-xs font-normal text-muted">from your answers</span>}</label>;
  if (q.type === "file") return <div>{label}<p className="text-xs text-muted">{/resume|cv/i.test(q.label) ? "The tailored PDF is attached by the runner." : "Optional upload, skipped."}</p></div>;
  if (q.options?.length) return <div>{label}<select id={name} name={name} defaultValue={q.answer || ""} className="field mt-1"><option value="">Choose...</option>{q.options.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>;
  if (q.type === "textarea" || q.needsHuman) return <div>{label}<textarea id={name} name={name} defaultValue={q.answer || ""} rows={3} className="field mt-1" /></div>;
  return <div>{label}<input id={name} name={name} defaultValue={q.answer || ""} className="field mt-1" /></div>;
}
