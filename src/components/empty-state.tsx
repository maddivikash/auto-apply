import Link from "next/link";

/**
 * A page with nothing to show yet: what will appear here, what is on its way, and the next step.
 * `steps` is the pipeline so far (label, count, link), shown only when something is in it.
 */
export function EmptyState({ icon, title, body, steps = [], primary, secondary }: {
  icon: React.ReactNode; title: string; body: string;
  steps?: { label: string; count: number; href: string; tone?: "go" | "signal" | "accent" }[];
  primary?: { href: string; label: string }; secondary?: { href: string; label: string };
}) {
  const live = steps.filter((s) => s.count > 0);
  const dot = { go: "bg-go", signal: "bg-signal", accent: "bg-accent" };
  return (
    <section className="panel relative overflow-hidden px-6 py-14 text-center md:py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,var(--accent-soft),transparent)]" aria-hidden />
      <div className="relative mx-auto max-w-md">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] bg-surface text-accent shadow-[var(--ring)]">{icon}</span>
        <h2 className="mt-5 text-[20px] font-medium tracking-[-0.02em]">{title}</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{body}</p>
        {live.length > 0 && (
          <ul className="mx-auto mt-6 max-w-sm divide-rows overflow-hidden rounded-[12px] bg-surface text-left text-[13.5px] shadow-[var(--ring)]">
            {live.map((s) => (
              <li key={s.label}><Link href={s.href} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60">
                <span className={`h-2 w-2 shrink-0 rounded-full ${dot[s.tone ?? "accent"]}`} />
                <span className="flex-1">{s.label}</span>
                <span className="font-medium tabular-nums">{s.count}</span><span className="text-faint" aria-hidden>→</span>
              </Link></li>
            ))}
          </ul>
        )}
        {(primary || secondary) && (
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {primary && <Link href={primary.href} className="btn-primary">{primary.label}</Link>}
            {secondary && <Link href={secondary.href} className="btn-ghost">{secondary.label}</Link>}
          </div>
        )}
      </div>
    </section>
  );
}
