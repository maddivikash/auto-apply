/**
 * Loading outlines shaped like each page, so a navigation shows the real layout at once and the
 * content fills in, instead of one generic placeholder everywhere.
 */
const pulse = "animate-pulse rounded-[8px] bg-surface-2";

export function Bar({ w = "w-full", h = "h-4", className = "" }: { w?: string; h?: string; className?: string }) {
  return <div className={`${pulse} ${w} ${h} ${className}`} />;
}

export function HeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="w-full max-w-2xl space-y-3"><Bar w="w-52" h="h-8" /><Bar w="w-full max-w-lg" className="opacity-70" /></div>
      {action && <Bar w="w-32" h="h-9" />}
    </div>
  );
}

/** A panel of list rows: title line, a meta line, something on the right. */
export function RowsSkeleton({ rows = 6, right = true }: { rows?: number; right?: boolean }) {
  return (
    <div className="panel divide-rows overflow-hidden">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-4" style={{ opacity: 1 - i * 0.1 }}>
          <div className="min-w-0 flex-1 space-y-2"><Bar w={i % 2 ? "w-2/3" : "w-1/2"} /><Bar w="w-1/3" h="h-3" className="opacity-70" /></div>
          {right && <><Bar w="w-24" h="h-1.5" className="hidden md:block" /><Bar w="w-28" h="h-6" className="rounded-full" /></>}
        </div>
      ))}
    </div>
  );
}

/** A labelled form section: title and hint on the left, fields on the right. */
export function FormSectionSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="panel grid gap-6 p-5 md:grid-cols-[200px_1fr] md:p-6">
      <div className="space-y-2"><Bar w="w-28" h="h-5" /><Bar w="w-40" h="h-3" className="opacity-70" /><Bar w="w-32" h="h-3" className="opacity-70" /></div>
      <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: fields }, (_, i) => <div key={i} className="space-y-2"><Bar w="w-24" h="h-3" className="opacity-70" /><Bar h="h-10" /></div>)}</div>
    </div>
  );
}

/** A US Letter page outline, for resume previews. */
export function PageSkeleton() {
  return (
    <div className="aspect-[17/22] w-full rounded-[8px] bg-white p-[7%] shadow-[var(--ring)]">
      <Bar w="w-1/3" h="h-5" className="mx-auto" />
      <Bar w="w-2/3" h="h-2.5" className="mx-auto mt-3 opacity-70" />
      {Array.from({ length: 5 }, (_, s) => (
        <div key={s} className="mt-6 space-y-2">
          <Bar w="w-1/4" h="h-3" />
          {Array.from({ length: 3 }, (_, i) => <Bar key={i} w={i === 2 ? "w-4/5" : "w-full"} h="h-2" className="opacity-60" />)}
        </div>
      ))}
    </div>
  );
}
