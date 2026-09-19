/**
 * The mark is the stage rail itself: five bars, three done, one live, one waiting. Solid square so it
 * holds up at 24px in a sidebar and at 40px on the landing page; the live bar carries the accent.
 */
export function BrandMark({ className = "", size = 28 }: { className?: string; size?: number }) {
  const bar = Math.max(2, Math.round(size * 0.11)), gap = Math.max(1, Math.round(size * 0.06)), h = Math.round(size * 0.5);
  return (
    <span className={`inline-flex shrink-0 items-center justify-center bg-fg ${className}`} style={{ width: size, height: size, borderRadius: Math.max(2, Math.round(size * 0.1)) }} aria-hidden>
      <span className="flex items-center" style={{ gap }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} style={{ width: bar, height: i === 3 ? h * 1.15 : h, borderRadius: 1, background: i < 3 ? "var(--bg)" : i === 3 ? "var(--accent)" : "color-mix(in srgb, var(--bg) 35%, var(--fg))" }} />
        ))}
      </span>
    </span>
  );
}
export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex items-center font-semibold tracking-[-0.035em] ${size === "lg" ? "gap-3 text-[22px]" : "gap-2.5 text-[17px]"}`}>
      <BrandMark size={size === "lg" ? 36 : 28} />
      <span className="whitespace-nowrap">Auto Apply</span>
    </span>
  );
}
