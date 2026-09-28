/**
 * The mark: a check mark (the application went out) with a small "z" beside it (you did not have to
 * lift a finger). The z carries the accent. No container, so it sits on black like type does, and the
 * strokes are thick enough to hold up as a 16px favicon.
 */
export function BrandMark({ className = "", size = 28 }: { className?: string; size?: number }) {
  return (
    <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M5 17.5 L12 24.5 L24 11" stroke="var(--fg)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3.5 H27.5 L21 10 H27.5" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex items-center font-semibold tracking-[-0.04em] ${size === "lg" ? "gap-3 text-[23px]" : "gap-2.5 text-[18px]"}`}>
      <BrandMark size={size === "lg" ? 30 : 24} />
      <span className="whitespace-nowrap leading-none">Lazy Apply</span>
    </span>
  );
}
