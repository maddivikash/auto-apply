"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "./toaster";
import type { ActionResult } from "./action-button";

type Choice = "tailored" | "full";

/**
 * Two small pills, one per resume version, each with its keyword match. The active one is filled.
 * Safe inside a link: clicks are stopped before they navigate.
 */
export function ResumeToggle({ id, choice, tailored, full, locked, action, size = "sm" }: {
  id: string; choice: Choice; tailored: number | null; full: number | null; locked?: boolean;
  action: (id: string, choice: Choice) => Promise<ActionResult>; size?: "sm" | "md";
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const pick = (c: Choice) => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (c === choice || locked) return;
    start(async () => {
      try { const r = await action(id, c); if (r.ok) { if (r.message) toast(r.message, "success"); router.refresh(); } else toast(r.error, "error"); }
      catch { toast("Something went wrong. Please try again.", "error"); }
    });
  };
  const cls = (c: Choice) => `${size === "sm" ? "px-2 py-[2px] text-[11.5px]" : "px-2.5 py-1 text-[12px]"} rounded-full tabular-nums transition-colors ${c === choice ? "bg-accent text-on-accent font-medium" : locked ? "text-faint" : "text-muted hover:bg-surface-2 hover:text-fg"}`;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full bg-surface p-[2px] shadow-[var(--ring)] ${busy ? "opacity-60" : ""}`} role="radiogroup" aria-label="Resume version" title={locked ? "Locked once the form is filled" : "Which resume is attached to this application"}>
      <button type="button" role="radio" aria-checked={choice === "tailored"} onClick={pick("tailored")} className={cls("tailored")} disabled={busy}title={tailored === null ? "Could not be scored: the posting was taken down before its text was stored" : undefined}>Tailored {tailored === null ? "—" : `${tailored}%`}</button>
      <button type="button" role="radio" aria-checked={choice === "full"} onClick={pick("full")} className={cls("full")} disabled={busy}title={full === null ? "Could not be scored: the posting was taken down before its text was stored" : undefined}>Original {full === null ? "—" : `${full}%`}</button>
    </span>
  );
}
