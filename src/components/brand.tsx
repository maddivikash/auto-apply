/**
 * The mark: five bars rising left to right, the way an application climbs its five stages; the
 * tallest carries the accent. No container, so it sits on black like type does. Geometry scales
 * from a 16px favicon to a 40px landing mark without thinning out.
 */
export function BrandMark({ className = "", size = 28 }: { className?: string; size?: number }) {
  const bar = Math.max(2, Math.round(size * 0.16)), gap = Math.max(1, Math.round(size * 0.05));
  const heights = [0.32, 0.48, 0.64, 0.82, 1];
  return (
    <span className={`inline-flex shrink-0 items-end ${className}`} style={{ height: size, gap }} aria-hidden>
      {heights.map((h, i) => (
        <span key={i} style={{ width: bar, height: Math.round(size * h), borderRadius: 1, background: i === 4 ? "var(--accent)" : "var(--fg)" }} />
      ))}
    </span>
  );
}
export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex items-center font-semibold tracking-[-0.04em] ${size === "lg" ? "gap-3 text-[23px]" : "gap-2.5 text-[18px]"}`}>
      <BrandMark size={size === "lg" ? 30 : 24} />
      <span className="whitespace-nowrap leading-none">Auto Apply</span>
    </span>
  );
}
