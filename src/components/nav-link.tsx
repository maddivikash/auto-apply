"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children, icon, badge, warn }: { href: string; children: React.ReactNode; icon?: React.ReactNode; badge?: number; warn?: boolean }) {
  const active = usePathname()?.startsWith(href);
  return (
    <Link href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? "bg-tint font-medium text-ink" : "text-muted hover:bg-tint/70 hover:text-ink"}`}>
      <span className={active ? "text-brand" : ""}>{icon}</span>
      <span className="flex-1">{children}</span>
      {badge ? <span className="rounded-full bg-signal px-2 py-0.5 text-[11px] font-medium text-white">{badge}</span> : warn ? <span className="h-2 w-2 rounded-full bg-signal" aria-label="Needs attention" /> : null}
    </Link>
  );
}
