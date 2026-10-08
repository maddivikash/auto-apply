"use client";
import { useRef } from "react";

/**
 * A GET filter form that applies itself: a changed dropdown submits at once, typing submits after a
 * short pause. The Search button stays for keyboard users and as a fallback.
 */
export function AutoSubmitForm({ children, className }: { children: React.ReactNode; className?: string }) {
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submit = () => form.current?.requestSubmit();
  return (
    <form ref={form} method="get" className={className}
      onChange={(e) => { if ((e.target as HTMLElement).tagName === "SELECT") submit(); }}
      onInput={(e) => {
        if ((e.target as HTMLElement).tagName !== "INPUT") return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(submit, 800);
      }}>
      {children}
    </form>
  );
}
