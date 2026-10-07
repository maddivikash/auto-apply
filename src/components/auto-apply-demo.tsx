"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, FileText, Link2, Loader2 } from "lucide-react";
import { ScoreRing } from "./score-ring";

/**
 * The hero: one application playing through on its own. A job link goes in, the base resume is
 * converted into a tailored one (bullets reordered, the job's terms lighting up, the score rising),
 * the form fills, and it stops at the Submit that only the applicant presses. Sample jobs only; the
 * scores are in the range the real keyword match produces (it is strict: 15 to 30 is typical).
 */
type Job = { id: string; role: string; company: string; board: string; url: string; keywords: string[]; picks: string[]; base: number; score: number; question: string };

const BULLETS: Record<string, string> = {
  api: "Built a FastAPI service that processes 2 million events a day with p95 latency under 120ms.",
  dlq: "Designed a retry and dead-letter pipeline on SQS that cut failed jobs by 70%.",
  dash: "Shipped a React dashboard used by 300 internal users, replacing three spreadsheets.",
  deploy: "Moved deployments to GitHub Actions and Kubernetes, from 2 hours to 15 minutes.",
  obs: "Added Grafana dashboards that the on-call rotation now uses for every incident.",
  ledger: "Built Ledgerlite in TypeScript and Next.js: 1,200 monthly users, row-level security.",
  etl: "Wrote Python and SQL ETL jobs loading 5 GB of daily sales data into a warehouse."
};
const BASE_ORDER = ["dash", "etl", "obs", "api"];

const JOBS: Job[] = [
  { id: "pay", role: "Backend Engineer, Payments", company: "Ledgerline", board: "Greenhouse", url: "boards.greenhouse.io/ledgerline/jobs/4471", keywords: ["FastAPI", "SQS", "Python", "SQL", "events"], picks: ["api", "dlq", "etl", "obs"], base: 16, score: 27, question: "Why payments?" },
  { id: "fe", role: "Frontend Engineer, Editor", company: "Canvasly", board: "Lever", url: "jobs.lever.co/canvasly/9f2c1e", keywords: ["React", "TypeScript", "Next.js", "dashboard", "users"], picks: ["dash", "ledger", "api", "deploy"], base: 14, score: 24, question: "A product you admire?" },
  { id: "infra", role: "Platform Engineer", company: "Stackfield", board: "Ashby", url: "jobs.ashbyhq.com/stackfield/2b7d", keywords: ["Kubernetes", "GitHub Actions", "Grafana", "on-call", "deployments"], picks: ["deploy", "obs", "dlq", "api"], base: 18, score: 29, question: "On-call experience?" }
];

const STAGES = ["Read the job", "Tailor the resume", "Answer the form", "Ready for you"];
// ms per phase: 0 typing the link, 1 reading, 2 tailoring, 3 answering, 4 holding at Submit
const DURATION = [1500, 1100, 2800, 2600, 4200];

export function AutoApplyDemo() {
  const [{ jobIndex, phase, tick }, setClock] = useState({ jobIndex: 0, phase: 0, tick: 0 });
  const [paused, setPaused] = useState(false);
  const job = JOBS[jobIndex];

  // One clock drives everything: 100 ms ticks, rolling into the next phase, then the next job.
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setClock((c) => {
      const next = c.tick + 100;
      if (next < DURATION[c.phase]) return { ...c, tick: next };
      return c.phase < 4 ? { ...c, phase: c.phase + 1, tick: 0 } : { jobIndex: (c.jobIndex + 1) % JOBS.length, phase: 0, tick: 0 };
    }), 100);
    return () => clearInterval(t);
  }, [paused]);

  const pick = (i: number) => { setClock({ jobIndex: i, phase: 0, tick: 0 }); setPaused(false); };
  const f = Math.min(1, tick / DURATION[phase]); // progress through the current phase
  const typed = phase === 0 ? job.url.slice(0, Math.ceil(job.url.length * f)) : job.url;
  const tailored = phase >= 2 && (phase > 2 || f > 0.25);
  const score = phase < 2 ? job.base : phase === 2 ? Math.round(job.base + (job.score - job.base) * Math.min(1, f * 1.4)) : job.score;
  const order = tailored ? job.picks : BASE_ORDER;
  const litKeywords = phase < 2 ? 0 : phase === 2 ? Math.floor(job.keywords.length * Math.min(1, f * 1.3)) : job.keywords.length;
  const fields: [string, string][] = [["Full name", "John Doe"], ["Email", "john.doe@example.com"], ["LinkedIn", "linkedin.com/in/john-doe"], ["Needs sponsorship?", "No"], [job.question, ""]];
  const filled = phase < 3 ? 0 : phase === 3 ? Math.floor(fields.length * f * 1.1) : fields.length;

  return (
    <div className="paper w-full rounded-[20px] bg-white p-4 text-[13px] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75)] sm:p-5" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Pick a job */}
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Sample job">
        <span className="eyebrow mr-1 !text-faint">Try a job</span>
        {JOBS.map((j, i) => (
          <button key={j.id} type="button" role="radio" aria-checked={i === jobIndex} onClick={() => pick(i)}
            className={`h-7 rounded-full px-3 text-[12px] transition-colors ${i === jobIndex ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg"}`}>{j.role.split(",")[0]}</button>
        ))}
      </div>

      {/* The link going in */}
      <div className="mt-3 flex items-center gap-2 rounded-[12px] bg-surface-2 p-1.5 pl-3">
        <Link2 size={14} className="shrink-0 text-muted" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg">{typed}{phase === 0 && <span className="ml-px inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-accent" />}</span>
        <span className={`btn-primary h-8 px-3 text-[12.5px] ${phase === 0 ? "opacity-60" : ""}`}>{phase === 1 ? <><Loader2 size={13} className="animate-spin" /> Reading</> : "Prepare"}</span>
      </div>

      {/* Stage rail */}
      <ol className="mt-4 grid grid-cols-4 gap-1.5">
        {STAGES.map((s, i) => {
          const done = phase > i + 1 || (phase === 4 && i === 3), active = phase === i + 1 || (phase === 0 && i === 0 && false);
          return (
            <li key={s}>
              <span className="block h-1 overflow-hidden rounded-full bg-surface-2"><span className={`block h-full rounded-full transition-[width] duration-200 ${done || (phase === 4 && i === 3) ? "bg-go" : "bg-accent"}`} style={{ width: done ? "100%" : active ? `${f * 100}%` : "0%" }} /></span>
              <span className={`mt-1.5 block truncate text-[11px] ${done || active ? "text-fg" : "text-faint"}`}>{s}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1.25fr_1fr]">
        {/* Resume conversion */}
        <div className="rounded-[14px] p-3.5 shadow-[var(--ring)]">
          <div className="flex items-center gap-3">
            <ScoreRing value={score} size={50} tone="var(--accent)" label="Keyword match" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[12.5px] font-medium"><FileText size={13} className="text-muted" />{tailored ? "Tailored resume" : "Your resume"}</div>
              <div className="truncate text-[11.5px] text-muted">{phase >= 1 ? `${job.company} · ${job.role}` : "Waiting for a link"}</div>
              {phase >= 2 && <div className="text-[11px] font-medium text-go">+{score - job.base} keyword match vs your base resume</div>}
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {order.map((id, i) => (
              <li key={`${tailored}-${id}`} className="flex gap-2 text-[11.5px] leading-snug text-fg/85 animate-[rise_0.45s_both]" style={{ animationDelay: `${i * 90}ms` }}>
                <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-fg/50" />
                <span><Highlight text={BULLETS[id]} terms={job.keywords.slice(0, litKeywords)} /></span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex min-h-[22px] flex-wrap gap-1">
            {job.keywords.slice(0, litKeywords).map((k) => <span key={k} className="chip animate-[rise_0.3s_both] bg-go-soft !py-[1px] text-[11px] text-go"><Check size={10} strokeWidth={3} />{k}</span>)}
          </div>
        </div>

        {/* Form filling */}
        <div className="rounded-[14px] p-3.5 shadow-[var(--ring)]">
          <div className="flex items-center justify-between text-[12.5px] font-medium">Application form<span className="meta">{job.board}</span></div>
          <ul className="mt-3 space-y-2">
            {fields.map(([label, value], i) => {
              const open = i === fields.length - 1;
              const on = i < filled;
              return (
                <li key={label}>
                  <div className="text-[10.5px] text-muted">{label}</div>
                  <div className={`mt-0.5 flex h-7 items-center rounded-[7px] px-2 text-[11.5px] transition-colors ${on ? (open ? "bg-signal-soft text-signal" : "bg-surface-2 text-fg") : "bg-surface-2/50 text-transparent"}`}>
                    {on ? (open ? "Needs your answer" : value) : "."}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* The end of the line */}
      <div className={`mt-3 flex items-center justify-between gap-3 rounded-[12px] px-3.5 py-2.5 transition-colors ${phase === 4 ? "bg-accent-soft" : "bg-surface-2/60"}`}>
        <span className="text-[12px] text-muted">{phase === 4 ? "Filled on your machine. Nothing is sent until you press Submit." : phase >= 1 ? "Working on it…" : "Paste a link to start"}</span>
        <span className={`btn-go h-8 px-3 text-[12.5px] ${phase === 4 ? "animate-pulse" : "opacity-40"}`}>Submit</span>
      </div>
    </div>
  );
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const parts = useMemo(() => {
    if (!terms.length) return [text];
    const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    return text.split(re);
  }, [text, terms]);
  return <>{parts.map((p, i) => (i % 2 ? <mark key={i} className="rounded-[3px] bg-go-soft px-0.5 text-go">{p}</mark> : <span key={i}>{p}</span>))}</>;
}
