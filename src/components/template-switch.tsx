"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate } from "lucide-react";
import { TEMPLATES, type TemplateId } from "@/lib/resume/templates";
import { toast } from "./toaster";
import type { ActionResult } from "./action-button";

/** Re-render one application's resume in another template, in place. Content is untouched. */
export function TemplateSwitch({ id, value, action, disabled }: { id: string; value: TemplateId; action: (id: string, template: string) => Promise<ActionResult>; disabled?: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  return (
    <label className={`relative inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-ctl)] bg-surface pl-2.5 text-[13px] shadow-[0_0_0_1px_var(--line-strong)] ${busy ? "opacity-60" : ""}`} title={disabled ? "Locked while the runner is working on this application, or after it was submitted" : "Switch template: the resume is re-rendered in a few seconds"}>
      {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden /> : <LayoutTemplate size={14} className="text-muted" aria-hidden />}
      <span className="sr-only">Template</span>
      <select value={value} disabled={busy || disabled} className="h-full appearance-none bg-transparent pr-7 font-medium outline-none" onChange={(e) => {
        const t = e.target.value;
        start(async () => {
          try { const r = await action(id, t); if (r.ok) { toast(r.message ?? "Template switched.", "success"); router.refresh(); } else toast(r.error, "error"); }
          catch { toast("Something went wrong. Please try again.", "error"); }
        });
      }}>
        {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <span className="pointer-events-none absolute right-2.5 text-[10px] text-muted" aria-hidden>▼</span>
    </label>
  );
}
