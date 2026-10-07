import { Bar, HeaderSkeleton } from "@/components/skeletons";

export default function Loading() {
  return <div className="space-y-6" aria-busy="true" aria-label="Loading"><HeaderSkeleton /><div className="panel grid gap-6 p-6 md:grid-cols-[200px_1fr]"><Bar w="w-32" h="h-5" /><Bar h="h-11" /></div><div className="panel space-y-4 p-6">{Array.from({ length: 4 }, (_, i) => <Bar key={i} h={i % 2 ? "h-16" : "h-5"} />)}</div></div>;
}
