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
  id: string; choice: Choice; tailored: number; full: number; locked?: boolean;
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
  const cls = (c: Choice) => `${size === "sm" ? "px-1.5 py-[1px] text-[11.5px]" : "px-2.5 py-1 text-[12.5px]"} rounded-full tabular-nums transition-colors ${c === choice ? "bg-fg text-bg font-medium" : locked ? "text-faint" : "text-muted hover:bg-surface-2 hover:text-fg"}`;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full border border-line p-[2px] ${busy ? "opacity-60" : ""}`} role="radiogroup" aria-label="Resume version" title={locked ? "Locked once the form is filled" : "Which resume is attached to this application"}>
      <button type="button" role="radio" aria-checked={choice === "tailored"} onClick={pick("tailored")} className={cls("tailored")} disabled={busy}>Tailored {tailored}%</button>
      <button type="button" role="radio" aria-checked={choice === "full"} onClick={pick("full")} className={cls("full")} disabled={busy}>Original {full}%</button>
    </span>
  );
}
