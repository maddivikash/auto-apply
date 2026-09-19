"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

type Tone = "success" | "error" | "info";
type Toast = { id: number; tone: Tone; message: string };
const EVENT = "app:toast";

/** Fire a toast from any client component. The <Toaster /> in the root layout renders it. */
export function toast(message: string, tone: Tone = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, tone } }));
}

const ICON = { success: CheckCircle2, error: CircleAlert, info: Info };
const TONE = { success: "text-go", error: "text-danger", info: "text-accent" };

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let seq = 0;
    const onToast = (e: Event) => {
      const { message, tone } = (e as CustomEvent<{ message: string; tone: Tone }>).detail;
      const id = ++seq;
      setItems((cur) => [...cur.slice(-3), { id, tone, message }]);
      setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), tone === "error" ? 8000 : 4500);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);
  if (items.length === 0) return null;
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {items.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <div key={t.id} role="status" className="pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-[var(--radius-ctl)] border border-line bg-surface px-3.5 py-2.5 text-[13.5px] leading-snug text-fg shadow-lg">
            <Icon size={16} className={`mt-0.5 shrink-0 ${TONE[t.tone]}`} aria-hidden />
            <span className="min-w-0 flex-1">{t.message}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setItems((cur) => cur.filter((x) => x.id !== t.id))} className="shrink-0 text-faint hover:text-fg"><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}
