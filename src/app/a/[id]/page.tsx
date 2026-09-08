import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authorized } from "@/lib/auth";
import { getApplication } from "@/lib/store";
import { approveAction, deleteAction, reprocessAction, requestSubmitAction, saveAnswersAction } from "../../actions";
import { IN_PROGRESS, LABEL, StatusBadge } from "../../status-badge";
import { AutoRefresh } from "./auto-refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ApplicationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  if (!(await authorized())) redirect("/login");
  const { id } = await params;
  const { saved } = await searchParams;
  const app = await getApplication(id);
  if (!app) notFound();
  const busy = IN_PROGRESS.includes(app.status);
  const open = app.questions.filter((q) => q.needsHuman || (!q.answer && q.required && q.type !== "file"));
  const rest = app.questions.filter((q) => !open.includes(q));

  return (
    <main className="space-y-8">
      {busy && <AutoRefresh seconds={5} />}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">← All applications</Link>
          <h1 className="mt-1 truncate text-2xl font-semibold">{app.job ? `${app.job.company}: ${app.job.title}` : "Reading the job post"}</h1>
          <p className="truncate text-sm text-neutral-500">{app.job?.location} · <a className="underline" href={app.url} target="_blank" rel="noreferrer">{app.url}</a></p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {busy && <p className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">{LABEL[app.status]}. This page refreshes on its own. Writing the resume takes about a minute.</p>}
      {app.status === "failed" && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800"><b>Failed:</b> {app.error} <form action={reprocessAction} className="mt-2 inline"><input type="hidden" name="id" value={app.id} /><button className="underline">Try again</button></form></div>}
      {app.status === "unsupported" && <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900"><b>Not possible from this link.</b> {app.error} Supported: Greenhouse, Lever and Ashby job pages.</div>}

      {app.jdSummary && (
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">What they want</h2>
          <p className="mt-2 text-sm">{app.jdSummary}</p>
          {app.fitNotes?.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-700">{app.fitNotes.map((n) => <li key={n}>{n}</li>)}</ul> : null}
        </section>
      )}

      {app.resumePdfUrl && (
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Tailored resume</h2>
              <p className="mt-1 text-sm text-neutral-700">{app.headline}{app.trims?.length ? <span className="text-neutral-500"> · trimmed to fit: {app.trims.join(", ")}</span> : null}</p>
              {app.resumeWarnings?.length ? <p className="mt-1 text-xs text-red-700">Checks flagged: {app.resumeWarnings.join("; ")}</p> : null}
            </div>
            <div className="flex gap-2">
              <a href={`/api/applications/${app.id}/pdf`} target="_blank" rel="noreferrer" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">Open PDF</a>
              <form action={reprocessAction}><input type="hidden" name="id" value={app.id} /><button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50" disabled={busy}>Regenerate</button></form>
            </div>
          </div>
          <iframe title="Resume preview" src={`/api/applications/${app.id}/pdf#toolbar=0&view=FitH`} className="mt-4 h-[720px] w-full rounded border border-neutral-200 bg-neutral-100" />
        </section>
      )}

      {app.job && (
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Application form</h2>
          {app.questions.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-600">{app.job.board === "greenhouse" ? "No questions on this form." : "This board does not publish its questions. The runner reads them from the live form and comes back with anything it cannot answer."}</p>
          ) : (
            <form action={saveAnswersAction} className="mt-3 space-y-5">
              <input type="hidden" name="id" value={app.id} />
              {open.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-red-700">Needs you ({open.length})</h3>
                  <div className="mt-2 space-y-3">{open.map((q) => <QuestionField key={q.id} q={q} />)}</div>
                </div>
              )}
              {rest.length > 0 && (
                <details open={open.length === 0}>
                  <summary className="cursor-pointer text-sm font-medium text-neutral-700">Already answered ({rest.length})</summary>
                  <div className="mt-2 space-y-3">{rest.map((q) => <QuestionField key={q.id} q={q} />)}</div>
                </details>
              )}
              <div className="flex items-center gap-3">
                <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">Save answers</button>
                {saved && <span className="text-sm text-emerald-700">Saved.</span>}
              </div>
            </form>
          )}
        </section>
      )}

      {app.job && !["unsupported", "failed"].includes(app.status) && (
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Submission</h2>
          <ol className="mt-3 space-y-2 text-sm">
            <Step done={["approved", "filling", "filled", "submit_requested", "submitted"].includes(app.status)} current={app.status === "ready"}>
              Approve the resume and answers. The local runner then fills the form without submitting.
              {app.status === "ready" && <form action={approveAction} className="mt-2"><input type="hidden" name="id" value={app.id} /><button className="rounded-md bg-violet-700 px-4 py-2 text-sm text-white" disabled={open.some((q) => q.required && !q.answer)}>Approve for filling</button>{open.some((q) => q.required && !q.answer) && <span className="ml-3 text-xs text-red-700">Answer the required questions first.</span>}</form>}
            </Step>
            <Step done={["filled", "submit_requested", "submitted"].includes(app.status)} current={["approved", "filling"].includes(app.status)}>
              Runner fills the form and takes a screenshot.
              {app.filledScreenshotUrl && <a className="ml-2 underline" href={app.filledScreenshotUrl} target="_blank" rel="noreferrer">View screenshot</a>}
              {app.runnerNotes?.length ? <ul className="mt-1 list-disc pl-5 text-xs text-neutral-600">{app.runnerNotes.map((n, i) => <li key={i}>{n}</li>)}</ul> : null}
            </Step>
            <Step done={app.status === "submitted"} current={app.status === "filled"}>
              You press Submit. Nothing is sent before this.
              {app.status === "filled" && <form action={requestSubmitAction} className="mt-2"><input type="hidden" name="id" value={app.id} /><button className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white">Submit application</button></form>}
              {app.status === "submitted" && <span className="ml-2 text-emerald-700">Submitted {app.submittedAt && new Date(app.submittedAt).toLocaleString()}.</span>}
            </Step>
          </ol>
        </section>
      )}

      <form action={deleteAction} className="text-right"><input type="hidden" name="id" value={app.id} /><button className="text-xs text-neutral-400 hover:text-red-700">Delete this application</button></form>
    </main>
  );
}

function Step({ done, current, children }: { done: boolean; current: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex gap-3 rounded-md px-3 py-2 ${current ? "bg-violet-50" : ""}`}>
      <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border ${done ? "border-emerald-600 bg-emerald-600" : current ? "border-violet-600" : "border-neutral-300"}`} />
      <div className="flex-1">{children}</div>
    </li>
  );
}

function QuestionField({ q }: { q: import("@/lib/store").QuestionState }) {
  const name = `q:${q.id}`;
  const label = <label htmlFor={name} className="block text-sm font-medium">{q.label}{q.required && <span className="text-red-600"> *</span>}{q.source && q.source !== "user" && <span className="ml-2 text-xs font-normal text-neutral-400">auto</span>}</label>;
  if (q.type === "file") return <div>{label}<p className="text-xs text-neutral-500">Attached automatically: the tailored resume PDF.</p></div>;
  if (q.options?.length) {
    return <div>{label}<select id={name} name={name} defaultValue={q.answer || ""} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"><option value="">Choose...</option>{q.options.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>;
  }
  if (q.type === "textarea" || q.needsHuman) {
    return <div>{label}<textarea id={name} name={name} defaultValue={q.answer || ""} rows={3} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" /></div>;
  }
  return <div>{label}<input id={name} name={name} defaultValue={q.answer || ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" /></div>;
}
