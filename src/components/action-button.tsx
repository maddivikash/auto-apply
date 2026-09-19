"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "./toaster";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/**
 * Button that runs a server action in place: shows a spinner while it runs, toasts the
 * outcome, and refreshes the page so the new state appears without a reload.
 */
export function ActionButton({ action, id, children, pending, className = "btn-ghost h-8", disabled }: {
  action: (id: string) => Promise<ActionResult>; id: string; children: React.ReactNode; pending: string; className?: string; disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const run = () => start(async () => {
    try {
      const r = await action(id);
      if (r.ok) { if (r.message) toast(r.message, "success"); router.refresh(); }
      else toast(r.error, "error");
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
  });
  return (
    <button type="button" onClick={run} disabled={busy || disabled} aria-busy={busy} className={className}>
      {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden />}
      {busy ? pending : children}
    </button>
  );
}
