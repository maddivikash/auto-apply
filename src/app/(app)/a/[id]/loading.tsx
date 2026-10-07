import { Bar, PageSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading application">
      <div className="space-y-3"><Bar w="w-28" h="h-3.5" className="opacity-70" /><div className="flex justify-between gap-4"><Bar w="w-2/3 max-w-xl" h="h-8" /><Bar w="w-32" h="h-6" className="rounded-full" /></div><Bar w="w-48" h="h-3.5" className="opacity-70" /><div className="flex max-w-md gap-1.5 pt-3">{Array.from({ length: 5 }, (_, i) => <Bar key={i} h="h-1" className="flex-1" />)}</div></div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="panel space-y-4 p-6"><div className="flex justify-between"><Bar w="w-24" h="h-3.5" /><Bar w="w-14" h="h-5" className="rounded-full" /></div><Bar w="w-28" h="h-11" /><Bar h="h-1.5" /><div className="flex flex-wrap gap-1.5 pt-2">{Array.from({ length: 6 }, (_, i) => <Bar key={i} w="w-16" h="h-5" className="rounded-full" />)}</div></div>
          <div className="panel space-y-4 p-6"><Bar w="w-32" h="h-5" />{Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-2"><Bar w="w-40" h="h-3" className="opacity-70" /><Bar h="h-10" /></div>)}</div>
        </div>
        <div className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-line px-5 py-4"><Bar w="w-36" h="h-5" /><div className="flex gap-2"><Bar w="w-28" h="h-8" /><Bar w="w-24" h="h-8" /></div></div><div className="bg-surface-2 p-3"><PageSkeleton /></div></div>
      </div>
    </div>
  );
}
