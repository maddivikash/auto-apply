import { HeaderSkeleton, RowsSkeleton } from "@/components/skeletons";

export default function Loading() {
  return <div className="space-y-8" aria-busy="true" aria-label="Loading notifications"><HeaderSkeleton action /><RowsSkeleton rows={8} right={false} /></div>;
}
