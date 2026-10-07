"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { ResumeFrame } from "./resume-frame";

type Page = { id: string; name: string; tier: string; blurb: string; html: string };

/** A fanned deck of templates: the focused one in front, neighbours tucked behind. Arrows, dots, keys or a click on a side card move it. */
export function TemplateCarousel({ pages }: { pages: Page[] }) {
  const [i, setI] = useState(1);
  const n = pages.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (hover) return;
    const t = setInterval(() => go(1), 4500);
    return () => clearInterval(t);
  }, [go, hover]);
  const cur = pages[i];
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onKeyDown={(e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); }} tabIndex={0} role="region" aria-roledescription="carousel" aria-label="Resume templates" className="outline-none">
      <div className="relative mx-auto h-[min(118vw,560px)] max-w-[1100px]">
        {pages.map((p, j) => {
          let off = j - i;
          if (off > n / 2) off -= n;
          if (off < -n / 2) off += n;
          const abs = Math.abs(off);
          const hidden = abs > 1;
          return (
            <button key={p.id} type="button" onClick={() => (off === 0 ? undefined : go(off))} aria-label={off === 0 ? `${p.name}, selected` : `Show ${p.name}`} tabIndex={hidden ? -1 : 0}
              className="absolute left-1/2 top-0 w-[min(76vw,410px)] origin-bottom transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
              style={{
                transform: `translateX(calc(-50% + ${off * 78}%)) translateY(${abs * 34}px) scale(${1 - abs * 0.16})`,
                zIndex: 10 - abs, opacity: hidden ? 0 : 1, pointerEvents: hidden ? "none" : "auto"
              }}>
              <div className={`relative overflow-hidden rounded-[10px] bg-white transition-shadow ${off === 0 ? "shadow-[0_0_0_2px_var(--accent),0_40px_80px_-30px_rgba(18,24,38,0.55)]" : "shadow-[0_20px_50px_-24px_rgba(18,24,38,0.5)]"}`}>
                <ResumeFrame html={p.html} title={`${p.name} template`} fill />
                {off !== 0 && <span className="absolute inset-0 bg-bg/45 transition-colors hover:bg-bg/20" aria-hidden />}
              </div>
            </button>
          );
        })}
        <button type="button" onClick={() => go(-1)} aria-label="Previous template" className="absolute left-0 top-[42%] z-20 flex h-11 w-11 items-center justify-center rounded-full bg-fg text-bg shadow-lg transition-transform hover:scale-105 sm:left-6"><ArrowLeft size={18} /></button>
        <button type="button" onClick={() => go(1)} aria-label="Next template" className="absolute right-0 top-[42%] z-20 flex h-11 w-11 items-center justify-center rounded-full bg-fg text-bg shadow-lg transition-transform hover:scale-105 sm:right-6"><ArrowRight size={18} /></button>
      </div>

      <div className="relative z-20 mx-auto -mt-6 flex max-w-md flex-col items-center text-center" aria-live="polite">
        <div className="flex items-center gap-2"><span className="text-[20px] font-medium tracking-[-0.02em]">{cur.name}</span><span className="meta rounded-full bg-surface-2 px-2 py-0.5">{cur.tier} tier</span></div>
        <p className="mt-1.5 min-h-[2.8em] text-[13.5px] leading-relaxed text-muted">{cur.blurb}</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="chip bg-go-soft text-go"><Check size={11} strokeWidth={3} /> Parses 100% on Greenhouse, Lever, Ashby</span>
          <Link href="/sign-up" className="btn-primary h-8 px-3 text-[12.5px]">Use {cur.name}</Link>
        </div>
        <div className="mt-5 flex gap-1.5">{pages.map((p, j) => <button key={p.id} type="button" onClick={() => setI(j)} aria-label={`Go to ${p.name}`} className={`h-1.5 rounded-full transition-all ${j === i ? "w-6 bg-accent" : "w-1.5 bg-line-strong hover:bg-muted"}`} />)}</div>
      </div>
    </div>
  );
}
