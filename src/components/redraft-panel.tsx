"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "./toaster";
import type { ActionResult } from "./action-button";

/** Under an AI-drafted answer: say what to change and have it rewritten from the profile. */
export function RedraftPanel({ id, questionId, action }: { id: string; questionId: string; action: (id: string, questionId: string, notes?: string) => Promise<ActionResult> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, start] = useTransition();
  const run = () => start(async () => {
    try {
      const r = await action(id, questionId, notes);
      if (r.ok) { toast(r.message ?? "Rewritten.", "success"); setOpen(false); setNotes(""); router.refresh(); }
      else toast(r.error, "error");
    } catch { toast("Something went wrong. Please try again.", "error"); }
  });
  return (
    <div className="mt-1.5">
      <button type="button" className="inline-flex items-center gap-1 text-[12.5px] text-accent hover:underline" aria-expanded={open} onClick={() => setOpen((v) => !v)}><RefreshCw size={12} aria-hidden /> Rewrite with a note</button>
      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. shorter, mention the MCP server project, more specific about impact" className="field h-9 min-w-[260px] flex-1 text-[13px]" aria-label="What to change" />
          <button type="button" onClick={run} disabled={busy} className="btn-ghost h-9">{busy ? "Rewriting" : "Rewrite"}</button>
        </div>
      )}
    </div>
  );
}
