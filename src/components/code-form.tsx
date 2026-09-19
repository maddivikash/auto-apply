"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "./toaster";
import type { ActionResult } from "./action-button";

/** Eight-character code from Greenhouse's verification email. */
export function CodeForm({ id, action, renew }: { id: string; action: (id: string, code: string) => Promise<ActionResult>; renew?: (id: string) => Promise<ActionResult> }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, start] = useTransition();
  const submit = () => start(async () => {
    try {
      const r = await action(id, code);
      if (r.ok) { toast(r.message ?? "Code saved.", "success"); setCode(""); router.refresh(); setTimeout(() => router.refresh(), 1500); setTimeout(() => router.refresh(), 4000); }
      else toast(r.error, "error");
    } catch { toast("Something went wrong. Please try again.", "error"); }
  });
  const askNew = () => start(async () => {
    if (!renew) return;
    try { const r = await renew(id); if (r.ok) { toast(r.message ?? "New code requested.", "success"); router.refresh(); setTimeout(() => router.refresh(), 2000); } else toast(r.error, "error"); }
    catch { toast("Something went wrong. Please try again.", "error"); }
  });
  return (
    <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <label className="text-[13px]"><span className="block font-medium">Security code</span>
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))} maxLength={10} autoComplete="one-time-code" inputMode="text" spellCheck={false} placeholder="Y19A1WG1" className="field mono mt-1.5 w-48 tracking-[0.2em]" aria-label="Security code from the Greenhouse email" />
      </label>
      <button type="submit" className="btn-go h-9" disabled={busy || code.trim().length < 6} aria-busy={busy}>
        {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden />}
        {busy ? "Saving" : "Send code to the form"}
      </button>
      {renew && <button type="button" onClick={askNew} disabled={busy} className="btn-ghost h-9">Code expired? Get a new one</button>}
    </form>
  );
}
