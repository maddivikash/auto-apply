import { Bar, HeaderSkeleton, RowsSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading open roles">
      <HeaderSkeleton />
      <div className="panel grid gap-3 p-4 md:grid-cols-[1fr_1fr_200px_auto]"><Bar h="h-10" /><Bar h="h-10" /><Bar h="h-10" /><Bar w="w-28" h="h-10" /></div>
      <div className="flex gap-2">{Array.from({ length: 3 }, (_, i) => <Bar key={i} w="w-24" h="h-8" className="rounded-full" />)}</div>
      <RowsSkeleton rows={8} />
    </div>
  );
}
