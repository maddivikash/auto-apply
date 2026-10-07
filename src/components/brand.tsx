/**
 * The mark: a teal tile holding a resume page whose last line trails off into a "z", because the
 * applying happens while you rest. Reads as a page at 16px and as the z up close.
 */
export function BrandMark({ className = "", size = 28 }: { className?: string; size?: number }) {
  return (
    <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#0b7f7a" />
      <path d="M10 7.5h9.5l3.5 3.5v13.5a1.5 1.5 0 0 1-1.5 1.5h-11.5a1.5 1.5 0 0 1-1.5-1.5v-15.5a1.5 1.5 0 0 1 1.5-1.5z" fill="#f4f2ed" />
      <path d="M12 13h7M12 16.5h5" stroke="#0b7f7a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17.5 20h4.5l-4.5 4h4.5" stroke="#f2a65a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex items-center font-semibold tracking-[-0.03em] text-fg ${size === "lg" ? "gap-3 text-[21px]" : "gap-2.5 text-[17px]"}`}>
      <BrandMark size={size === "lg" ? 30 : 26} />
      <span className="whitespace-nowrap leading-none">Lazy Apply</span>
    </span>
  );
}
