import { Bar, HeaderSkeleton, PageSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading templates">
      <HeaderSkeleton />
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="space-y-3 rounded-[18px] bg-surface-2 p-3"><PageSkeleton /><Bar w="w-24" h="h-5" /><Bar w="w-full" h="h-3" className="opacity-70" /></div>)}</div>
    </div>
  );
}
