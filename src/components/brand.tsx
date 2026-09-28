/**
 * The mark: a face dozing off with a "z" floating up, because the applying happens while you rest.
 * The z carries the accent. No container, so it sits on black like type does, and the strokes hold up
 * as a 16px favicon.
 */
export function BrandMark({ className = "", size = 28 }: { className?: string; size?: number }) {
  return (
    <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="14" cy="18" r="11" stroke="var(--fg)" strokeWidth="2.8" />
      <path d="M8.5 17 Q10.5 19 12.5 17 M15.5 17 Q17.5 19 19.5 17 M11.5 23 H16.5" stroke="var(--fg)" strokeWidth="2.2" />
      <path d="M22 2.5 H29 L22 9.5 H29" stroke="var(--accent)" strokeWidth="2.4" />
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
