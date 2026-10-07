/**
 * The mark: a sheet of paper whose corner folds into a forward arrow, because the resume goes out
 * while you rest. Warm peach page, royal-blue fold, navy ink: the three colours of the product.
 * Holds up as a 16px favicon.
 */
export function BrandMark({ className = "", size = 28 }: { className?: string; size?: number }) {
  return (
    <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="la-page" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffc6a8" /><stop offset="1" stopColor="#f07aa0" /></linearGradient>
        <linearGradient id="la-fold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8f78ff" /><stop offset="1" stopColor="#2c44dc" /></linearGradient>
      </defs>
      <path d="M8 3h11l7 7v16a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" fill="url(#la-page)" />
      <path d="M5 15.5c6.5 0 11.5 2.6 14.6 7.6L22.8 29H8a3 3 0 0 1-3-3z" fill="url(#la-fold)" />
      <path d="M19 3v5a2 2 0 0 0 2 2h5" fill="#071a31" fillOpacity="0.85" />
    </svg>
  );
}
export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex items-center font-semibold text-fg ${size === "lg" ? "gap-3 text-[18px]" : "gap-2.5 text-[15px]"}`}>
      <BrandMark size={size === "lg" ? 30 : 26} />
      <span className="whitespace-nowrap uppercase leading-none tracking-[0.14em]">Lazy Apply</span>
    </span>
  );
}
