"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "./toaster";

/** Read-only value with a copy button. Falls back to selecting the text where the clipboard is unavailable. */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setDone(true); toast(`${label} copied.`, "success"); setTimeout(() => setDone(false), 2000); }
    catch { toast("Could not access the clipboard. Select the text and copy it.", "error"); }
  };
  return (
    <div className="flex items-stretch gap-2">
      <code className="mono block min-w-0 flex-1 break-all rounded-[var(--radius-ctl)] border border-line bg-surface-2/60 px-3 py-2.5 text-[13px]" aria-label={label}>{value}</code>
      <button type="button" onClick={copy} aria-label={`Copy ${label.toLowerCase()}`} className="btn-ghost h-auto px-3">{done ? <Check size={14} className="text-go" /> : <Copy size={14} />}</button>
    </div>
  );
}
