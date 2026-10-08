"use client";
import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "./toaster";
import type { ActionResult } from "./action-button";

/** The one button on the connect page; after it, the user only needs their terminal. */
export function ConnectButton({ code, action }: { code: string; action: (code: string) => Promise<ActionResult> }) {
  const [done, setDone] = useState(false);
  const [busy, start] = useTransition();
  if (done) return <p className="mt-6 flex items-center justify-center gap-2 text-[14px] font-medium text-go"><CheckCircle2 size={18} /> Connected. You can close this tab.</p>;
  return (
    <button type="button" className="btn-primary btn-lg mt-6 w-full" disabled={busy} aria-busy={busy} onClick={() => start(async () => {
      try { const r = await action(code); if (r.ok) setDone(true); else toast(r.error, "error"); }
      catch { toast("Something went wrong. Please try again.", "error"); }
    })}>{busy ? "Connecting" : "Connect this computer"}</button>
  );
}
