import { Bar, PageSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading the resume editor">
      <div className="space-y-3"><Bar w="w-40" h="h-3.5" className="opacity-70" /><Bar w="w-48" h="h-8" /><Bar w="w-72" h="h-3.5" className="opacity-70" /></div>
      <div className="flex gap-2">{Array.from({ length: 7 }, (_, i) => <Bar key={i} w="w-24" h="h-8" className="rounded-full" />)}</div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_280px]">
        <div className="panel space-y-4 p-5">{Array.from({ length: 5 }, (_, i) => <Bar key={i} h={i % 2 ? "h-20" : "h-10"} />)}</div>
        <PageSkeleton />
        <div className="panel space-y-3 p-5"><Bar w="w-20" h="h-3.5" /><Bar w="w-24" h="h-11" /><Bar h="h-1.5" /><div className="flex flex-wrap gap-1.5">{Array.from({ length: 5 }, (_, i) => <Bar key={i} w="w-14" h="h-5" className="rounded-full" />)}</div></div>
      </div>
    </div>
  );
}
