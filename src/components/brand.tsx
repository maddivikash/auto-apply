/** The mark is the stage rail itself: five segments, three done, one live, one waiting. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-[7px] bg-fg ${className}`} aria-hidden>
      <span className="flex items-center gap-[2px]">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="h-[10px] w-[2.5px] rounded-full" style={{ background: i < 3 ? "var(--go)" : i === 3 ? "var(--signal)" : "var(--faint)", opacity: i === 4 ? 0.6 : 1 }} />
        ))}
      </span>
    </span>
  );
}
export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-semibold tracking-[-0.02em] ${size === "lg" ? "text-[19px]" : "text-[16px]"}`}>
      <BrandMark className={size === "lg" ? "h-7 w-7" : ""} />
      <span className="whitespace-nowrap">Auto Apply</span>
    </span>
  );
}
