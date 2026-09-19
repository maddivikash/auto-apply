"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children, icon, badge, warn }: { href: string; children: React.ReactNode; icon?: React.ReactNode; badge?: number; warn?: boolean }) {
  const active = usePathname()?.startsWith(href);
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`group relative flex h-9 items-center gap-2.5 rounded-[var(--radius-ctl)] px-2.5 text-[13.5px] transition-colors ${active ? "bg-surface-2 font-medium text-fg" : "text-muted hover:bg-surface-2/70 hover:text-fg"}`}>
      {active && <span className="absolute -left-2 top-2 h-5 w-[2px] rounded-full bg-accent" aria-hidden />}
      <span className={active ? "text-fg" : "text-faint group-hover:text-muted"}>{icon}</span>
      <span className="flex-1">{children}</span>
      {badge && !active ? <span className="mono rounded-[2px] bg-accent px-1.5 py-0.5 text-[10.5px] font-medium leading-none text-black">{badge}</span> : warn ? <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-label="Needs attention" /> : null}
    </Link>
  );
}
