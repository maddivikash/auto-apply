/** In-app navigation: the shell stays, the page area shows a skeleton until the data arrives. */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <div className="h-7 w-48 animate-pulse rounded bg-surface-2" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded bg-surface-2/70" />
      </div>
      <div className="panel h-16 animate-pulse" />
      <div className="panel space-y-px overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-16 animate-pulse bg-surface-2/40" />)}
      </div>
    </div>
  );
}
