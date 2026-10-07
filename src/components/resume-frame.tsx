"use client";
import { useEffect, useRef, useState } from "react";

const PAGE_W = 816, PAGE_H = 1056; // US Letter at 96 dpi, the size renderPdf lays out

/**
 * A resume's HTML drawn at true page size and scaled to the container's width, so a preview looks
 * exactly like the PDF. Sandboxed with no scripts; fonts still load.
 */
export function ResumeFrame({ html, title, className = "", interactive = false, onMeasure }: { html: string; title: string; className?: string; interactive?: boolean;
  /** Called with content height / page height once fonts load: above 1 means the resume runs past one page. */
  onMeasure?: (pages: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / PAGE_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className={`relative w-full overflow-hidden bg-white ${className}`} style={{ aspectRatio: `${PAGE_W} / ${PAGE_H}` }}>
      {scale > 0 && (
        <iframe
          title={title}
          srcDoc={html}
          sandbox="allow-same-origin"
          tabIndex={interactive ? 0 : -1}
          className={`absolute left-0 top-0 origin-top-left border-0 ${interactive ? "" : "pointer-events-none"}`}
          style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})` }}
          onLoad={onMeasure ? (e) => {
            const doc = e.currentTarget.contentDocument;
            const page = doc?.querySelector(".page") as HTMLElement | null;
            if (!doc || !page) return;
            doc.fonts.ready.then(() => { page.style.minHeight = "0"; const h = page.scrollHeight; page.style.minHeight = ""; onMeasure(h / PAGE_H); });
          } : undefined}
        />
      )}
    </div>
  );
}
