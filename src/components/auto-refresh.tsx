"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a server-rendered page current without a reload: re-fetches on an interval, pauses while the
 * tab is hidden, and refreshes immediately when the tab regains focus. Uncontrolled inputs keep what
 * the person is typing across a refresh.
 */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!timer) timer = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, seconds * 1000); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVisible = () => { if (document.visibilityState === "visible") { router.refresh(); start(); } else stop(); };
    start();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onVisible); };
  }, [router, seconds]);
  return null;
}
