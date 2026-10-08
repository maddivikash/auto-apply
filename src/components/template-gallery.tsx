"use client";
import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { ResumeFrame } from "./resume-frame";
import { TemplateLightbox, type PreviewPage } from "./template-lightbox";
import { UseTemplateButton } from "./template-picker";
import type { ActionResult } from "./action-button";

type Item = PreviewPage & { font: string };

/** The Templates page grid. Clicking a preview opens it full size; every card can be made the default. */
export function TemplateGallery({ tiers, items, current, action }: { tiers: { tier: string; title: string; body: string }[]; items: Item[]; current: string; action: (id: string) => Promise<ActionResult> }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      {tiers.map(({ tier, title, body }) => (
        <section key={tier}>
          <div className="flex flex-col gap-3 border-t border-line pt-8 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="pill bg-surface text-fg shadow-[var(--ring)]"><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold text-white ${tier === "S" ? "bg-go" : "bg-accent"}`}>{tier}</span>{tier} tier</span>
              <h2 className="mt-3 text-[26px] font-medium tracking-[-0.03em]">{title}</h2>
            </div>
            <p className="max-w-sm text-[13.5px] leading-relaxed text-muted">{body}</p>
          </div>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((t, i) => t.tier !== tier ? null : (
              <li key={t.id} className={`group rounded-[18px] p-3 transition-shadow ${t.id === current ? "bg-accent-soft shadow-[0_0_0_2px_var(--accent)]" : "bg-surface-2 hover:shadow-[var(--ring)]"}`}>
                <button type="button" onClick={() => setOpen(i)} aria-label={`Open ${t.name} full size`} className="relative block w-full overflow-hidden rounded-[8px] text-left shadow-[0_1px_2px_rgba(18,24,38,0.08),0_12px_30px_-18px_rgba(18,24,38,0.4)]">
                  <ResumeFrame html={t.html} title={`${t.name} template preview`} fill />
                  <span className="absolute inset-0 flex items-center justify-center bg-[#121826]/0 opacity-0 transition-all group-hover:bg-[#121826]/25 group-hover:opacity-100">
                    <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-[#121826] shadow-lg"><Maximize2 size={14} /> View full size</span>
                  </span>
                </button>
                <div className="px-1 pb-1 pt-4">
                  <div className="flex items-baseline justify-between gap-3"><h3 className="text-[16px] font-medium">{t.name}</h3><span className="meta uppercase">{t.font}</span></div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{t.blurb}</p>
                  <div className="mt-3 flex items-center justify-between gap-3"><span className="text-[12.5px] text-go">✓ Parsable by all major ATS</span><UseTemplateButton id={t.id} current={t.id === current} action={action} /></div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {open !== null && <TemplateLightbox pages={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} footer={(p) => <UseTemplateButton id={p.id} current={p.id === current} action={action} />} />}
    </>
  );
}
