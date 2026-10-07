/** The small "parsable by all major ATS" chip with the boards' initials, as on a template card. */
export function AtsBadge({ className = "mb-4" }: { className?: string }) {
  const boards: [string, string][] = [["G", "#24a47f"], ["L", "#1c2b3a"], ["A", "#5b4fe8"], ["W", "#0875e1"]];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full bg-go-soft py-1 pl-1 pr-3 text-[12.5px] font-medium text-go ${className}`}>
      <span className="flex -space-x-1.5">{boards.map(([l, c]) => <span key={l} className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-[var(--bg)]" style={{ background: c }}>{l}</span>)}</span>
      ✓ Parsable by all major ATS
    </span>
  );
}
