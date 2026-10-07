"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, Sparkles } from "lucide-react";
import { ResumeFrame } from "./resume-frame";

/** Hero: the sample resume in every template. Cycles on its own until the visitor picks one. */
export function TemplatePlayground({ pages }: { pages: { id: string; name: string; html: string }[] }) {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setI((x) => (x + 1) % pages.length), 3200);
    return () => clearInterval(t);
  }, [auto, pages.length]);
  return (
    <div>
      <div className="relative overflow-hidden rounded-[8px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]">
        {pages.map((p, j) => (
          <div key={p.id} className={`transition-opacity duration-500 ${j === i ? "relative opacity-100" : "pointer-events-none absolute inset-0 opacity-0"}`} aria-hidden={j !== i}>
            <ResumeFrame html={p.html} title={`${p.name} template`} fill />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5" role="radiogroup" aria-label="Preview a template">
        {pages.map((p, j) => (
          <button key={p.id} type="button" role="radio" aria-checked={j === i} onClick={() => { setI(j); setAuto(false); }}
            className={`h-7 rounded-full px-3 text-[12.5px] transition-colors ${j === i ? "bg-white text-[#121826]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>{p.name}</button>
        ))}
        <button type="button" onClick={() => setAuto((a) => !a)} aria-label={auto ? "Pause" : "Play"} className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">{auto ? <Pause size={12} /> : <Play size={12} />}</button>
      </div>
    </div>
  );
}

/**
 * "How it works": one recorded clip per step. Every clip stays mounted and stacked, so switching
 * steps is a crossfade, not a fresh load; the current and next clips preload, the poster (the
 * clip's first frame) shows at once, and a loader appears only if a clip is still buffering.
 */
export function HowItWorks({ steps }: { steps: { title: string; body: string; video: string; poster: string }[] }) {
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [near, setNear] = useState(false);
  const [soon, setSoon] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    // Two stages, so a landing page visit downloads nothing here until the visitor scrolls to it:
    // the current poster when the frame is about to appear, the clips once it is actually on screen.
    const early = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSoon(true); }, { rootMargin: "100px 0px" });
    const onScreen = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true); }, { threshold: 0.15 });
    if (frame.current) { early.observe(frame.current); onScreen.observe(frame.current); }
    io.observe(el);
    return () => { io.disconnect(); early.disconnect(); onScreen.disconnect(); };
  }, []);
  useEffect(() => {
    videos.current.forEach((v, j) => {
      if (!v) return;
      if (j !== i) { v.pause(); return; }
      v.currentTime = 0;
      if (visible) v.play().catch(() => {});
      else v.pause();
    });
  }, [i, visible]);
  const select = (j: number) => { setProgress(0); setI(j); };
  return (
    <div ref={box} className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-center">
      <ol className="space-y-2" role="tablist" aria-label="How it works">
        {steps.map((s, j) => (
          <li key={s.title}>
            <button type="button" role="tab" aria-selected={j === i} onClick={() => select(j)}
              className={`relative w-full overflow-hidden rounded-[14px] p-4 text-left transition-colors ${j === i ? "bg-surface shadow-[var(--ring)]" : "hover:bg-surface/60"}`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${j === i ? "bg-accent text-white" : j < i ? "bg-go-soft text-go" : "bg-surface-2 text-muted"}`}>{j < i ? <Check size={12} strokeWidth={3} /> : j + 1}</span>
                <span className={`text-[15px] font-medium ${j === i ? "text-fg" : "text-muted"}`}>{s.title}</span>
              </div>
              <p className={`overflow-hidden pl-9 text-[13.5px] leading-relaxed text-muted transition-all duration-300 ${j === i ? "mt-2 max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>{s.body}</p>
              {j === i && <span className="absolute bottom-0 left-0 h-[3px] bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} aria-hidden />}
            </button>
          </li>
        ))}
      </ol>
      {/* Sized by the screen height as well as the width, so the whole frame is visible with the heading above it. */}
      <div className="mx-auto w-full overflow-hidden rounded-[16px] bg-[#121826] p-1.5 shadow-[0_30px_70px_-30px_rgba(18,24,38,0.55)] lg:max-w-[max(560px,calc((100svh-280px)*1.6))]">
        <div className="flex items-center gap-1.5 px-2.5 py-2" aria-hidden><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="ml-3 truncate text-[11.5px] text-white/50">lazyapply.online</span></div>
        <div ref={frame} className="relative aspect-[16/10] overflow-hidden rounded-[10px] bg-[#f4f2ed]">
          {steps.map((s, j) => (
            <video key={s.video} ref={(el) => { videos.current[j] = el; }} src={near ? s.video : undefined} poster={near || (soon && j === i) ? s.poster : undefined} muted playsInline
              preload={!near ? "none" : j === i || j === (i + 1) % steps.length ? "auto" : "none"}
              aria-label={`${s.title}: screen recording`} aria-hidden={j !== i}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${j === i ? "opacity-100" : "opacity-0"}`}
              onWaiting={() => j === i && setBuffering(true)}
              onPlaying={() => j === i && setBuffering(false)}
              onCanPlay={() => j === i && setBuffering(false)}
              onTimeUpdate={(e) => { if (j !== i) return; const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
              onEnded={() => j === i && select((i + 1) % steps.length)} />
          ))}
          {buffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#f4f2ed]/40 backdrop-blur-[1px]" aria-hidden>
              <span className="flex items-center gap-2.5 rounded-full bg-[#121826]/85 px-4 py-2 text-[12.5px] text-white shadow-lg">
                <span className="flex gap-1">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#5fd3c8]" style={{ animationDelay: `${d * 120}ms` }} />)}</span>
                Loading the clip
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Toolkit tile: press the button and watch a weak bullet become a specific one. */
export function RewriteDemo() {
  const before = "Worked on the events service and made it faster.";
  const after = "Built a FastAPI service that processes 2 million events a day with p95 latency under 120ms.";
  const [typed, setTyped] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTyped((n) => {
      if (n + 2 >= after.length) { setRunning(false); return after.length; }
      return n + 2;
    }), 18);
    return () => clearInterval(t);
  }, [running, after.length]);
  const done = typed >= after.length;
  return (
    <div className="paper mt-6 rounded-[12px] bg-white p-4 text-[13px]">
      <div className="flex items-center justify-between gap-2">
        <span className="chip bg-accent-soft text-accent"><Sparkles size={11} /> AI rewrite</span>
        <button type="button" className="btn-primary h-7 px-2.5 text-[12px]" disabled={running} onClick={() => { setTyped(0); setRunning(true); }}>{done ? "Again" : running ? "Rewriting" : "Rewrite it"}</button>
      </div>
      <p className={`mt-3 transition-colors ${typed ? "text-faint line-through" : "text-fg"}`}>{before}</p>
      <p className="mt-1 min-h-[2.6em]">{typed ? <>{after.slice(0, typed)}{!done && <span className="ml-px inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-accent" />}</> : <span className="text-faint">Press the button.</span>}</p>
      {done && <p className="mt-2 text-[11.5px] text-go">✓ Every number came from the profile</p>}
    </div>
  );
}
