import { Bar, HeaderSkeleton, RowsSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading applications">
      <HeaderSkeleton />
      <div className="panel flex gap-2 p-2"><Bar h="h-12" className="flex-1" /><Bar w="w-48" h="h-12" /></div>
      <div className="flex flex-wrap gap-5">{Array.from({ length: 6 }, (_, i) => <Bar key={i} w="w-28" h="h-3.5" className="opacity-70" />)}</div>
      <RowsSkeleton rows={7} />
    </div>
  );
}
