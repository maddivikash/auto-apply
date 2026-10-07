/** A circular 0 to 100 gauge: the fit score as a ring that closes as the resume matches more of the job. */
export function ScoreRing({ value, size = 64, label, tone: forced }: { value: number; size?: number; label?: string; tone?: string }) {
  const stroke = Math.max(4, Math.round(size / 11));
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const tone = forced ?? (v >= 70 ? "var(--go)" : v >= 50 ? "var(--accent)" : "var(--signal)");
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={label ?? "Fit score"}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <span className="absolute font-medium tabular-nums tracking-[-0.03em]" style={{ fontSize: size * 0.3 }}>{v}</span>
    </span>
  );
}
