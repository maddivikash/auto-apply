"use client";
import { useEffect, useRef, useState } from "react";

const PAGE_W = 816, PAGE_H = 1056; // US Letter at 96 dpi, the size renderPdf lays out

/**
 * A resume's HTML drawn at true page size and scaled to the container's width, so a preview looks
 * exactly like the PDF. Sandboxed with no scripts; fonts still load.
 */
export function ResumeFrame({ html, title, className = "", interactive = false, onMeasure, fill = false }: { html: string; title: string; className?: string; interactive?: boolean;
  /** Called with content height / page height once fonts load: above 1 means the resume runs past one page. */
  onMeasure?: (pages: number) => void;
  /** Showcase only (galleries, landing): enlarge a short page until it reaches the bottom. Never for a real resume's preview. */
  fill?: boolean }) {
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
          onLoad={onMeasure || fill ? (e) => {
            const doc = e.currentTarget.contentDocument;
            const page = doc?.querySelector(".page") as HTMLElement | null;
            if (!doc || !page) return;
            doc.fonts.ready.then(() => {
              page.style.minHeight = "0";
              // Measure the content as written first, so "runs over a page" is still reported when fill shrinks it to fit.
              const h = page.scrollHeight;
              if (fill) fillPage(page);
              // Keep the sheet exactly one page tall at whatever zoom fillPage chose, so nothing spills out of the frame.
              page.style.minHeight = fill ? `${11 / Number(page.style.getPropertyValue("zoom") || 1)}in` : "";
              onMeasure?.(h / PAGE_H);
            });
          } : undefined}
        />
      )}
    </div>
  );
}

/**
 * Fit the content to exactly one sheet, as the PDF renderer does: grow a short page, and shrink a long
 * one instead of cutting it off. Zoom the content while widening or narrowing the page by the same
 * factor, so the paper size stays put and lines rewrap. Binary search on the largest zoom that fits.
 */
function fillPage(page: HTMLElement) {
  const height = (z: number) => { page.style.setProperty("zoom", String(z)); page.style.width = `${8.5 / z}in`; return page.scrollHeight * z; };
  const fits = (z: number) => height(z) <= PAGE_H * 0.985;
  const natural = height(1);
  if (natural >= PAGE_H * 0.94 && natural <= PAGE_H * 0.985) return;
  let lo = natural > PAGE_H ? 0.5 : 1, hi = natural > PAGE_H ? 1 : 1.6;
  for (let i = 0; i < 10; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
  height(lo);
}
