"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "./toaster";
import type { ActionResult } from "./action-button";

/** "Use this template" on a gallery card. The current default shows as a check instead. */
export function UseTemplateButton({ id, current, action }: { id: string; current: boolean; action: (id: string) => Promise<ActionResult> }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  if (current) return <span className="pill bg-go-soft text-go"><Check size={13} strokeWidth={3} /> Your default</span>;
  return (
    <button type="button" className="btn-primary h-8 px-3 text-[12.5px]" disabled={busy} aria-busy={busy} onClick={() => start(async () => {
      try { const r = await action(id); if (r.ok) { toast(r.message ?? "Saved.", "success"); router.refresh(); } else toast(r.error, "error"); }
      catch { toast("Something went wrong. Please try again.", "error"); }
    })}>{busy ? "Saving" : "Use this template"}</button>
  );
}
