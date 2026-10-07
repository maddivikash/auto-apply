"use client";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";

const APP = /^\/(dashboard|discover|applied|templates|notifications|profile|answers|runner|connect|a\/)/;

/**
 * Shown while a page outside the current shell loads, most often right after sign-in, while the app
 * layout reads the profile. For app pages it draws the app's own frame, so the dashboard arrives
 * into a layout that is already there instead of after a blank screen.
 */
export default function Loading() {
  const path = usePathname() || "";
  if (!APP.test(path)) return <main className="min-h-screen bg-bg" aria-busy="true" />;
  const bar = "animate-pulse rounded-[8px] bg-surface-2";
  return (
    <div className="flex min-h-screen bg-bg" aria-busy="true" aria-label="Loading your workspace">
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-line px-4 py-5 md:flex">
        <div className="px-1.5 py-1"><Brand /></div>
        <div className="mt-7 space-y-2">{Array.from({ length: 5 }, (_, i) => <div key={i} className={`h-9 ${bar} ${i === 0 ? "bg-surface shadow-[var(--ring)]" : "opacity-60"}`} />)}</div>
        <div className="mt-8 space-y-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className={`h-9 opacity-60 ${bar}`} />)}</div>
      </aside>
      <main className="mx-auto w-full max-w-[1280px] space-y-8 px-5 py-8 md:px-8 md:py-10">
        <div className="space-y-3"><div className={`h-8 w-56 ${bar}`} /><div className={`h-4 w-full max-w-lg opacity-70 ${bar}`} /></div>
        <div className="panel h-[68px] animate-pulse" />
        <div className="panel space-y-px overflow-hidden">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-16 animate-pulse bg-surface-2/40" />)}</div>
      </main>
      <div className="fixed bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-fg px-4 py-2 text-[12.5px] text-bg shadow-lg">
        <span className="flex gap-1">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#5fd3c8]" style={{ animationDelay: `${d * 120}ms` }} />)}</span>
        Signing you in
      </div>
    </div>
  );
}
