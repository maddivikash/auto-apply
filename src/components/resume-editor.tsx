"use client";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Highlighter, Plus, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import type { TailoredResume } from "@/lib/resume/schema";
import type { Profile } from "@/lib/profile/types";
import { resumeHtml, TEMPLATES, type TemplateId } from "@/lib/resume/templates";
import { matchResume } from "@/lib/resume/match";
import { ResumeFrame } from "./resume-frame";
import { toast } from "./toaster";
import type { ActionResult } from "./action-button";

type Rewrite = (id: string, bullet: string, instruction?: string) => Promise<{ ok: true; text: string } | { ok: false; error: string }>;
type Save = (id: string, input: { resume: unknown; template: string }) => Promise<ActionResult>;
type Section = "experience" | "projects" | "skills" | "achievements";

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/**
 * The resume editor: edit every line, rewrite one bullet with AI, switch the template, and watch the
 * page and the keyword match update as you type. Nothing is saved until Save, which re-renders the PDF.
 */
export function ResumeEditor({ id, title, initial, profile, renderProfile, template: initialTemplate, jd, company, rewrite, save, locked }: {
  id: string; title: string; initial: TailoredResume; profile: Profile; renderProfile: Profile; template: TemplateId;
  jd: string; company: string; rewrite: Rewrite; save: Save; locked?: string;
}) {
  const router = useRouter();
  const [resume, setResume] = useState<TailoredResume>(() => clone(initial));
  const [saved, setSaved] = useState<TailoredResume>(() => clone(initial));
  const [template, setTemplate] = useState<TemplateId>(initialTemplate);
  const [savedTemplate, setSavedTemplate] = useState<TemplateId>(initialTemplate);
  const [section, setSection] = useState<Section>("experience");
  const [highlight, setHighlight] = useState(true);
  const [fit, setFit] = useState<number | null>(null);
  const [saving, startSave] = useTransition();
  const [leaving, setLeaving] = useState(false);

  const dirty = template !== savedTemplate || JSON.stringify(resume) !== JSON.stringify(saved);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const deferred = useDeferredValue(resume);
  const match = useMemo(() => matchResume(jd, deferred, profile, company), [jd, deferred, profile, company]);
  const savedMatch = useMemo(() => matchResume(jd, saved, profile, company), [jd, saved, profile, company]);
  const [previewHtml, setPreviewHtml] = useState(() => resumeHtml(initial, renderProfile, 1, initialTemplate));
  useEffect(() => {
    const t = setTimeout(() => {
      const html = resumeHtml(deferred, renderProfile, 1, template);
      setPreviewHtml(highlight ? markTerms(html, match.matched) : html);
    }, 300);
    return () => clearTimeout(t);
  }, [deferred, renderProfile, template, highlight, match.matched]);

  const update = (fn: (r: TailoredResume) => void) => setResume((prev) => { const next = clone(prev); fn(next); return next; });
  const edited = countEdits(saved, resume);

  const doSave = (then?: () => void) => startSave(async () => {
    try {
      const r = await save(id, { resume, template });
      if (r.ok) { toast(r.message ?? "Saved.", "success"); setSaved(clone(resume)); setSavedTemplate(template); if (then) then(); else router.refresh(); }
      else toast(r.error, "error");
    } catch { toast("Something went wrong. Please try again.", "error"); }
  });
  const goBack = () => { setLeaving(false); router.push(`/a/${id}`); router.refresh(); };

  const total = match.matched.length + match.missing.length;
  const strength = match.tailored >= 70 ? ["Strong", "bg-go-soft text-go"] : match.tailored >= 50 ? ["Good", "bg-accent-soft text-accent"] : ["Fair", "bg-signal-soft text-signal"];
  const delta = match.tailored - savedMatch.tailored;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/a/${id}`} onClick={(e) => { if (dirty) { e.preventDefault(); setLeaving(true); } }} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg"><ArrowLeft size={14} /> Back to the application</Link>
          <h1 className="mt-2 text-[26px] font-medium leading-tight tracking-[-0.03em]">Edit resume</h1>
          <p className="mt-1 truncate text-[13.5px] text-muted">Tailored for {title}</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-[12.5px] text-signal">Unsaved changes</span>}
          <button type="button" className="btn-quiet h-9" disabled={!dirty || saving} onClick={() => { setResume(clone(saved)); setTemplate(savedTemplate); }}><RotateCcw size={14} /> Discard</button>
          <button type="button" className="btn-primary h-9" disabled={!dirty || saving || !!locked} aria-busy={saving} onClick={() => doSave()} title={locked}>
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden />}
            {saving ? "Rendering PDF" : "Save and render"}
          </button>
        </div>
      </div>
      {locked && <p className="rounded-[var(--radius-ctl)] bg-signal-soft px-4 py-2.5 text-[13px] text-signal">{locked}</p>}
      {leaving && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#121826]/40 p-4 backdrop-blur-[2px] sm:items-center" onClick={() => !saving && setLeaving(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="leave-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape" && !saving) setLeaving(false); }} className="w-full max-w-md rounded-[var(--radius-panel)] bg-surface p-5 shadow-xl">
            <h2 id="leave-title" className="text-[16px] font-medium">You have unsaved changes</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">Save them to update the PDF on this application, or leave them behind.</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-quiet h-9" disabled={saving} onClick={() => setLeaving(false)} autoFocus>Keep editing</button>
              <button type="button" className="btn-ghost h-9" disabled={saving} onClick={() => { setResume(clone(saved)); setTemplate(savedTemplate); goBack(); }}>Discard changes</button>
              <button type="button" className="btn-primary h-9" disabled={saving || !!locked} aria-busy={saving} onClick={() => doSave(goBack)}>{saving ? "Saving" : "Save and go back"}</button>
            </div>
          </div>
        </div>
      )}

      <TemplateStrip value={template} onChange={setTemplate} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_280px]">
        {/* Editor */}
        <section className="panel min-w-0 self-start overflow-hidden">
          <div className="flex gap-1 overflow-x-auto border-b border-line p-1.5" role="tablist">
            {(["experience", "projects", "skills", "achievements"] as Section[]).map((s) => (
              <button key={s} role="tab" aria-selected={section === s} onClick={() => setSection(s)} className={`h-8 rounded-[8px] px-3 text-[13px] capitalize transition-colors ${section === s ? "bg-surface-2 font-medium text-fg" : "text-muted hover:text-fg"}`}>{s}</button>
            ))}
          </div>
          <div className="space-y-5 p-4 md:p-5">
            {section === "experience" && resume.roles.map((role, ri) => (
              <div key={ri} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Title" value={role.title} onChange={(v) => update((r) => { r.roles[ri].title = v; })} />
                  <Field label="Company" value={role.company} onChange={(v) => update((r) => { r.roles[ri].company = v; })} />
                  <Field label="Start" value={role.start} onChange={(v) => update((r) => { r.roles[ri].start = v; })} />
                  <Field label="End" value={role.end} onChange={(v) => update((r) => { r.roles[ri].end = v; })} />
                </div>
                {role.groups.map((g, gi) => (
                  <div key={gi} className="rounded-[12px] bg-surface-2/60 p-3">
                    <div className="flex items-center gap-2">
                      <input aria-label="Group heading" value={g.heading} onChange={(e) => update((r) => { r.roles[ri].groups[gi].heading = e.target.value; })} className="min-w-0 flex-1 bg-transparent text-[13px] font-medium italic text-fg outline-none placeholder:text-faint" placeholder="Group heading" />
                      {role.groups.length > 1 && <IconBtn label="Remove group" onClick={() => update((r) => { r.roles[ri].groups.splice(gi, 1); })}><Trash2 size={13} /></IconBtn>}
                    </div>
                    <BulletList id={id} bullets={g.bullets} rewrite={rewrite} onChange={(b) => update((r) => { r.roles[ri].groups[gi].bullets = b; })} />
                  </div>
                ))}
                <button type="button" className="btn-quiet h-8 text-[12.5px]" onClick={() => update((r) => { r.roles[ri].groups.push({ heading: "", bullets: [""] }); })}><Plus size={13} /> Add group</button>
                {ri < resume.roles.length - 1 && <hr className="border-line" />}
              </div>
            ))}

            {section === "projects" && (<>
              {resume.projects.map((p, pi) => (
                <div key={pi} className="space-y-2 rounded-[12px] bg-surface-2/60 p-3">
                  <div className="grid grid-cols-[1fr_1fr_80px_auto] items-end gap-2">
                    <Field label="Name" value={p.name} onChange={(v) => update((r) => { r.projects[pi].name = v; })} />
                    <Field label="Stack" value={p.stack} onChange={(v) => update((r) => { r.projects[pi].stack = v; })} />
                    <Field label="Year" value={p.year} onChange={(v) => update((r) => { r.projects[pi].year = v; })} />
                    <IconBtn label="Remove project" onClick={() => update((r) => { r.projects.splice(pi, 1); })}><Trash2 size={13} /></IconBtn>
                  </div>
                  <BulletList id={id} bullets={p.bullets} rewrite={rewrite} onChange={(b) => update((r) => { r.projects[pi].bullets = b; })} />
                </div>
              ))}
              {profile.projects.filter((x) => !resume.projects.some((p) => p.name === x.name)).length > 0 && (
                <div>
                  <div className="eyebrow !text-faint">From your profile</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profile.projects.filter((x) => !resume.projects.some((p) => p.name === x.name)).map((x) => (
                      <button key={x.name} type="button" className="btn-ghost h-8 text-[12.5px]" onClick={() => update((r) => { r.projects.push({ name: x.name, stack: x.stack, year: x.year, bullets: x.bullets.slice(0, 2) }); })}><Plus size={13} /> {x.name}</button>
                    ))}
                  </div>
                </div>
              )}
            </>)}

            {section === "skills" && (<>
              {resume.skills.map((s, si) => (
                <div key={si} className="grid grid-cols-[140px_1fr_auto] items-start gap-2">
                  <input aria-label="Skill group" value={s.label} onChange={(e) => update((r) => { r.skills[si].label = e.target.value; })} className="field h-9 text-[13px] font-medium" />
                  <textarea aria-label={`${s.label} items`} value={s.items.join(", ")} rows={2} onChange={(e) => update((r) => { r.skills[si].items = e.target.value.split(",").map((x) => x.trimStart()); })} className="field resize-y text-[13px]" />
                  <IconBtn label="Remove skill group" onClick={() => update((r) => { r.skills.splice(si, 1); })}><Trash2 size={13} /></IconBtn>
                </div>
              ))}
              <button type="button" className="btn-quiet h-8 text-[12.5px]" onClick={() => update((r) => { r.skills.push({ label: "", items: [] }); })}><Plus size={13} /> Add skill group</button>
              <p className="text-[12px] text-muted">Separate items with commas. Only list skills you can talk about in an interview.</p>
            </>)}

            {section === "achievements" && (
              <BulletList id={id} bullets={resume.achievements} rewrite={rewrite} onChange={(b) => update((r) => { r.achievements = b; })} allowEmpty />
            )}
            <p className="text-[12px] text-faint">Wrap a term in **double asterisks** to bold it. Long resumes are trimmed to one page when you save.</p>
          </div>
        </section>

        {/* Live page */}
        <section className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <div className="mb-2 flex items-center justify-between gap-2 text-[12.5px]">
            <span className="eyebrow">Live preview</span>
            <button type="button" onClick={() => setHighlight((v) => !v)} aria-pressed={highlight} className={`chip ${highlight ? "bg-go-soft text-go" : "text-muted hover:text-fg"}`}><Highlighter size={12} /> Highlight matched keywords</button>
          </div>
          <div className="overflow-hidden rounded-[10px] shadow-[0_1px_2px_rgba(18,24,38,0.08),0_24px_50px_-24px_rgba(18,24,38,0.45)]">
            <ResumeFrame html={previewHtml} title="Resume preview" onMeasure={setFit} fill />
          </div>
        </section>

        {/* Score */}
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="panel-pad !p-5">
            <div className="flex items-center justify-between"><span className="text-[13px] text-muted">Job match</span><span className={`pill ${strength[1]}`}>{strength[0]}</span></div>
            <div className="mt-2 flex items-baseline gap-2"><span className="text-[44px] font-medium leading-none tracking-[-0.04em] tabular-nums">{match.tailored}%</span>{delta !== 0 && <span className={`text-[13px] font-medium tabular-nums ${delta > 0 ? "text-go" : "text-signal"}`}>{delta > 0 ? "+" : ""}{delta}</span>}</div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-go transition-[width] duration-500" style={{ width: `${match.tailored}%` }} /></div>
            <div className="eyebrow mt-5 !text-faint">Keywords matched · {match.matched.length} of {total}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">{match.matched.map((k) => <span key={k} className="chip bg-go-soft text-go"><Check size={11} strokeWidth={3} />{k}</span>)}</div>
            {match.missing.length > 0 && (<>
              <div className="eyebrow mt-4 !text-faint">Not found</div>
              <div className="mt-2 flex flex-wrap gap-1.5">{match.missing.map((k) => <span key={k} className="chip border border-dashed border-line-strong text-muted">{k}</span>)}</div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-faint">Add a term only where it is true of your work.</p>
            </>)}
          </div>
          <dl className="panel divide-rows text-[13px]">
            <Stat k="Lines edited" v={String(edited)} />
            <Stat k="Length" v={fit === null ? "Measuring" : fit <= 1 ? "1 page" : `Over by ${Math.round((fit - 1) * 100)}%`} tone={fit !== null && fit > 1 ? "text-signal" : "text-go"} />
            <Stat k="Template" v={TEMPLATES.find((t) => t.id === template)?.name ?? template} />
            <Stat k="ATS readable" v="Pass" tone="text-go" />
          </dl>
          {fit !== null && fit > 1 && <p className="text-[12px] leading-relaxed text-muted">Saving fits it to one page by shrinking the type a little and trimming the least important lines. Cut a bullet yourself to choose what goes.</p>}
        </aside>
      </div>
    </div>
  );
}

function TemplateStrip({ value, onChange }: { value: TemplateId; onChange: (t: TemplateId) => void }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Template">
      <span className="eyebrow mr-1 shrink-0 !text-faint">Template</span>
      {TEMPLATES.map((t) => (
        <button key={t.id} type="button" role="radio" aria-checked={value === t.id} onClick={() => onChange(t.id)} title={t.blurb}
          className={`h-8 shrink-0 rounded-full px-3.5 text-[13px] transition-colors ${value === t.id ? "bg-fg text-bg" : "bg-surface text-muted shadow-[var(--ring)] hover:text-fg"}`}>{t.name}</button>
      ))}
      <Link href="/templates" className="ml-1 shrink-0 text-[12.5px] text-accent hover:underline">See all</Link>
    </div>
  );
}

/** Bullets with per-line AI rewrite. A rewrite shows as a before/after until accepted. */
function BulletList({ id, bullets, onChange, rewrite, allowEmpty }: { id: string; bullets: string[]; onChange: (b: string[]) => void; rewrite: Rewrite; allowEmpty?: boolean }) {
  const set = (i: number, v: string) => onChange(bullets.map((b, j) => (j === i ? v : b)));
  const move = (i: number, d: number) => { const n = [...bullets]; [n[i], n[i + d]] = [n[i + d], n[i]]; onChange(n); };
  return (
    <ul className="mt-2 space-y-2">
      {bullets.map((b, i) => (
        <Bullet key={i} id={id} value={b} rewrite={rewrite} onChange={(v) => set(i, v)}
          onUp={i > 0 ? () => move(i, -1) : undefined} onDown={i < bullets.length - 1 ? () => move(i, 1) : undefined}
          onRemove={bullets.length > 1 || allowEmpty ? () => onChange(bullets.filter((_, j) => j !== i)) : undefined} />
      ))}
      <li><button type="button" className="btn-quiet h-7 px-2 text-[12.5px]" onClick={() => onChange([...bullets, ""])}><Plus size={13} /> Add bullet</button></li>
    </ul>
  );
}

function Bullet({ id, value, onChange, rewrite, onUp, onDown, onRemove }: { id: string; value: string; onChange: (v: string) => void; rewrite: Rewrite; onUp?: () => void; onDown?: () => void; onRemove?: () => void }) {
  const [ask, setAsk] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const run = () => start(async () => {
    try {
      const r = await rewrite(id, value, instruction);
      if (r.ok) { setProposal(r.text); setAsk(false); } else toast(r.error, "error");
    } catch { toast("Something went wrong. Please try again.", "error"); }
  });
  const len = value.replace(/\*\*/g, "").length;
  return (
    <li className="group rounded-[10px] bg-surface p-2 shadow-[var(--ring)]">
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={Math.max(2, Math.ceil(len / 48))} aria-label="Bullet"
        className="w-full resize-none [field-sizing:content] bg-transparent px-1 text-[13px] leading-relaxed text-fg outline-none placeholder:text-faint" placeholder="What you did, and what came of it." />
      {proposal !== null && (
        <div className="mt-1 rounded-[8px] bg-accent-soft p-2.5 text-[13px]">
          <div className="flex items-center gap-2"><span className="chip bg-surface text-accent"><Sparkles size={11} /> AI rewrite</span></div>
          <p className="mt-2 text-muted line-through decoration-danger/60">{value.replace(/\*\*/g, "")}</p>
          <p className="mt-1 text-fg" dangerouslySetInnerHTML={{ __html: escBold(proposal) }} />
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn-primary h-7 px-2.5 text-[12px]" onClick={() => { onChange(proposal); setProposal(null); }}><Check size={12} /> Accept</button>
            <button type="button" className="btn-quiet h-7 px-2 text-[12px]" onClick={() => setProposal(null)}><X size={12} /> Keep mine</button>
            <button type="button" className="btn-quiet h-7 px-2 text-[12px]" disabled={busy} onClick={run}>{busy ? "Rewriting" : "Try again"}</button>
          </div>
        </div>
      )}
      {ask && proposal === null && (
        <div className="mt-1 flex gap-2">
          <input autoFocus value={instruction} onChange={(e) => setInstruction(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") run(); if (e.key === "Escape") setAsk(false); }}
            placeholder="Optional: lead with the result, shorter, mention Kubernetes" className="field h-8 flex-1 text-[12.5px]" />
          <button type="button" className="btn-primary h-8 px-3 text-[12.5px]" disabled={busy} onClick={run}>{busy ? "Rewriting" : "Rewrite"}</button>
        </div>
      )}
      <div className="mt-1 flex items-center gap-1">
        <button type="button" className="chip text-accent hover:bg-accent-soft disabled:opacity-50" disabled={busy || !value.trim()} onClick={() => setAsk((v) => !v)}><Sparkles size={12} /> {busy ? "Rewriting" : "AI rewrite"}</button>
        <span className={`meta ml-1 ${len > 230 ? "!text-signal" : ""}`}>{len}</span>
        <span className="ml-auto flex opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {onUp && <IconBtn label="Move up" onClick={onUp}><ArrowUp size={13} /></IconBtn>}
          {onDown && <IconBtn label="Move down" onClick={onDown}><ArrowDown size={13} /></IconBtn>}
          {onRemove && <IconBtn label="Remove bullet" onClick={onRemove}><Trash2 size={13} /></IconBtn>}
        </span>
      </div>
    </li>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block min-w-0"><span className="text-[11.5px] text-muted">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="field mt-1 h-9 text-[13px]" /></label>;
}
function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-muted hover:bg-surface-2 hover:text-fg">{children}</button>;
}
function Stat({ k, v, tone = "" }: { k: string; v: string; tone?: string }) {
  return <div className="flex items-center justify-between px-4 py-2.5"><dt className="text-muted">{k}</dt><dd className={`font-medium ${tone}`}>{v}</dd></div>;
}

const escBold = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

/** Lines that differ from the saved version, counted across every list in the resume. */
function countEdits(a: TailoredResume, b: TailoredResume): number {
  const lines = (r: TailoredResume) => [
    ...r.roles.flatMap((x) => [x.title, x.company, x.start, x.end, ...x.groups.flatMap((g) => [g.heading, ...g.bullets])]),
    ...r.projects.flatMap((p) => [p.name, p.stack, p.year, ...p.bullets]),
    ...r.skills.map((s) => `${s.label}:${s.items.join(",")}`), ...r.achievements
  ];
  const before = new Set(lines(a));
  return lines(b).filter((l) => !before.has(l)).length;
}

/** Preview only: tint the job's matched terms in the page text. Never reaches the PDF. */
function markTerms(html: string, terms: string[]): string {
  if (!terms.length) return html;
  const words = [...terms].sort((x, y) => y.length - x.length).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"));
  const re = new RegExp(`\\b(${words.join("|")})(s|es)?\\b`, "gi");
  const at = html.indexOf("<body>");
  if (at < 0) return html;
  const body = html.slice(at).replace(/>([^<]+)</g, (_m, text: string) => `>${text.replace(re, '<mark style="background:#d9f3e2;color:inherit;border-radius:2px;padding:0 1px">$&</mark>')}<`);
  return html.slice(0, at) + body;
}
