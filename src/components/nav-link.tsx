"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children, badge, warn }: { href: string; children: React.ReactNode; badge?: number; warn?: boolean }) {
  const active = usePathname()?.startsWith(href);
  return (
    <Link href={href} className={`flex items-center justify-between rounded-md px-3 py-2 ${active ? "bg-tint font-medium text-ink" : "text-muted hover:bg-tint hover:text-ink"}`}>
      <span>{children}</span>
      {badge ? <span className="rounded-full bg-signal px-2 py-0.5 text-[11px] font-medium text-white">{badge}</span> : warn ? <span className="h-2 w-2 rounded-full bg-signal" aria-label="Needs attention" /> : null}
    </Link>
  );
}
