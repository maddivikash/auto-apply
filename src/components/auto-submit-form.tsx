"use client";
import { createContext, useContext, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Filters that update results in place. Changing a filter navigates inside the page (the URL still
 * changes, so links and Back work), the header and current results stay on screen, and only the
 * results region shows that it is loading. A full page load used to blank everything.
 */
const Ctx = createContext<{ pending: boolean; go: (href: string) => void }>({ pending: false, go: () => {} });

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (href: string) => start(() => router.replace(href, { scroll: false }));
  return <Ctx.Provider value={{ pending, go }}>{children}</Ctx.Provider>;
}

/** A GET filter form: a changed dropdown applies at once; typed words apply on Enter or Search. */
export function AutoSubmitForm({ children, className }: { children: React.ReactNode; className?: string }) {
  const { go } = useContext(Ctx);
  const path = usePathname();
  const form = useRef<HTMLFormElement>(null);
  const apply = () => {
    if (!form.current) return;
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(form.current)) params.set(k, String(v));
    go(`${path}?${params}`);
  };
  return (
    <form ref={form} method="get" className={className}
      onSubmit={(e) => { e.preventDefault(); apply(); }}
      onChange={(e) => { if ((e.target as HTMLElement).tagName === "SELECT") apply(); }}>
      {children}
    </form>
  );
}

/** A link that changes filters or pages the same in-place way. */
export function FilterLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const { go } = useContext(Ctx);
  return <a href={href} className={className} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); go(href); }}>{children}</a>;
}

/** The results while new ones load: kept in place, dimmed, with a thin progress bar on top. */
export function PendingRegion({ children }: { children: React.ReactNode }) {
  const { pending } = useContext(Ctx);
  return (
    <div className="relative" aria-busy={pending}>
      {pending && <div className="absolute inset-x-0 top-0 z-10 h-[3px] overflow-hidden rounded-full bg-accent-soft"><div className="h-full w-1/3 animate-[slide_1s_ease-in-out_infinite] rounded-full bg-accent" /></div>}
      <div className={`transition-opacity duration-200 ${pending ? "pointer-events-none opacity-50" : "opacity-100"}`}>{children}</div>
    </div>
  );
}
