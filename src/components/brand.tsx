/** Five bars, the stage track, doubling as the mark. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-end gap-[3px] ${className}`} aria-hidden>
      {[10, 14, 18, 14, 10].map((h, i) => <span key={i} className="w-[5px] rounded-sm" style={{ height: h, background: i < 3 ? "var(--go)" : i === 3 ? "var(--signal)" : "var(--line)" }} />)}
    </span>
  );
}
export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  return <span className={`inline-flex items-center gap-2.5 ${size === "lg" ? "text-2xl" : "text-lg"}`}><BrandMark /><span className="serif whitespace-nowrap tracking-tight">Auto Apply</span></span>;
}
