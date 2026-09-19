"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "./toaster";
import type { ActionResult } from "./action-button";

/**
 * Regenerate with instructions. The user says what to change (add a project, reorder, shorten bullets)
 * and the tailoring step revises the previous version instead of starting from scratch.
 */
export function RegeneratePanel({ id, action, disabled, lastNotes }: { id: string; action: (id: string, notes?: string) => Promise<ActionResult>; disabled?: boolean; lastNotes?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, start] = useTransition();
  const run = () => start(async () => {
    try {
      const r = await action(id, notes);
      if (r.ok) { toast(r.message ?? "Regenerating.", "success"); setOpen(false); setNotes(""); router.refresh(); }
      else toast(r.error, "error");
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
  });
  return (
    <div>
      <button type="button" className="btn-ghost h-8" disabled={disabled} aria-expanded={open} onClick={() => setOpen((v) => !v)} title={disabled ? "Available once the current step finishes" : "Regenerate the resume, optionally with instructions"}>
        <RefreshCw size={14} aria-hidden /> Regenerate
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => !busy && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby={`notes-title-${id}`} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape" && !busy) setOpen(false); }} className="w-full max-w-lg rounded-[var(--radius-panel)] border border-line bg-surface p-5 shadow-xl">
            <h2 id={`notes-title-${id}`} className="text-[15px] font-semibold">Regenerate the resume</h2>
            <label htmlFor={`notes-${id}`} className="mt-3 block text-[13px] font-medium">What should change?</label>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">Optional. Examples: lead with the Context Proxy project, shorter bullets, drop the intern role, put Skills before Projects. Only facts already on your Profile page can be used.</p>
            <textarea id={`notes-${id}`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={1500} placeholder={lastNotes ? `Last time: ${lastNotes}` : "Leave empty to simply regenerate."} className="field mt-2 text-[13px]" autoFocus />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" className="btn-quiet h-9" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button type="button" className="btn-primary h-9" onClick={run} disabled={busy} aria-busy={busy}>
                {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden />}
                {busy ? "Starting" : notes.trim() ? "Rewrite with notes" : "Regenerate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
