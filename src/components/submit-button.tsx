"use client";
import { useFormStatus } from "react-dom";

/** Shows what is happening while a server action runs, so a long step never looks frozen. */
export function SubmitButton({ children, pending, className = "btn-primary" }: { children: React.ReactNode; pending: string; className?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button className={className} disabled={busy} aria-busy={busy}>
      {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {busy ? pending : children}
    </button>
  );
}
