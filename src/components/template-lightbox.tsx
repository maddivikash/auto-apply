"use client";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { ResumeFrame } from "./resume-frame";

export type PreviewPage = { id: string; name: string; tier: string; blurb: string; html: string };

/**
 * A template at full size: the page as large as the screen allows, ← → to move between templates,
 * Esc or the backdrop to close. `footer` holds the call to action (use it, or sign up).
 */
export function TemplateLightbox({ pages, index, onIndex, onClose, footer }: { pages: PreviewPage[]; index: number; onIndex: (i: number) => void; onClose: () => void; footer?: (p: PreviewPage) => React.ReactNode }) {
  const n = pages.length, p = pages[index];
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % n);
      if (e.key === "ArrowLeft") onIndex((index - 1 + n) % n);
    };
    window.addEventListener("keydown", key);
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = overflow; };
  }, [index, n, onClose, onIndex]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0e1b1d]/85 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${p.name} template, full size`} onClick={onClose}>
      <div className="flex items-center justify-between gap-4 px-5 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="text-[17px] font-medium">{p.name}</span><span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{p.tier} tier</span><span className="text-[12px] text-white/50">{index + 1} / {n}</span></div>
          <p className="truncate text-[12.5px] text-white/65">{p.blurb}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {footer?.(p)}
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-8" onClick={onClose}>
        {/* As tall as the screen allows, never wider than a comfortable reading size. */}
        <div className="mx-auto w-full max-w-[min(860px,calc((100svh-110px)*0.773))]" onClick={(e) => e.stopPropagation()}>
          <div className="overflow-hidden rounded-[6px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"><ResumeFrame key={p.id} html={p.html} title={`${p.name} template`} fill /></div>
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + n) % n); }} aria-label="Previous template" className="fixed left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#121826] shadow-lg hover:scale-105"><ArrowLeft size={18} /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % n); }} aria-label="Next template" className="fixed right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#121826] shadow-lg hover:scale-105"><ArrowRight size={18} /></button>
      </div>
    </div>
  );
}
