"use client";

import { useEffect, useState } from "react";

/**
 * Shown in place of Clerk's sign-in or sign-up card while Clerk's script and its UI bundle load from
 * clerk.lazyapply.online (about one second on a normal connection, measured from India). It says what is
 * happening instead of drawing a fake form, keeps the real card's footprint so nothing jumps, and after
 * six seconds reloads once by itself; if that did not help, it explains the usual cause and offers a reload.
 */
export function AuthCardSkeleton({ title, subtitle }: { title: string; subtitle: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    // A first load sometimes stalls on one of Clerk's requests and a reload fixes it. Do that once, by
    // itself, after six seconds; if the reload did not help either, say so instead of looping.
    const KEY = "la-auth-reloaded";
    const t = setTimeout(() => {
      let already = false;
      try { already = sessionStorage.getItem(KEY) === "1"; if (!already) sessionStorage.setItem(KEY, "1"); } catch { already = true; }
      if (already) setSlow(true);
      else window.location.reload();
    }, 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-[16px] bg-surface shadow-[var(--ring)]" role="status" aria-live="polite" aria-busy="true">
      <div className="flex min-h-[380px] flex-col items-center justify-center px-10 py-9 text-center">
        <div className="text-[17px] font-semibold">{title}</div>
        <div className="mt-1 text-[13px] text-muted">{subtitle}</div>
        <svg className="mt-9 h-7 w-7 animate-spin text-accent motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <p className="mt-4 text-[13.5px] text-muted">{slow ? "Still loading the secure sign-in." : "Loading the secure sign-in…"}</p>
        {slow && (
          <p className="mt-3 max-w-[300px] text-[13px] leading-relaxed text-muted">
            It usually takes a second, and one automatic reload did not help. An ad blocker or privacy extension may be holding back clerk.lazyapply.online: allow it for this site, then{" "}
            <a href="" onClick={(e) => { e.preventDefault(); window.location.reload(); }} className="font-medium text-fg underline underline-offset-2">reload</a>.
          </p>
        )}
      </div>
    </div>
  );
}
