import { HeaderSkeleton, RowsSkeleton } from "@/components/skeletons";

export default function Loading() {
  return <div className="space-y-8" aria-busy="true" aria-label="Loading submitted applications"><HeaderSkeleton /><RowsSkeleton rows={6} /></div>;
}
