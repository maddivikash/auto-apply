import { HeaderSkeleton, RowsSkeleton } from "@/components/skeletons";

/** Fallback for app pages without their own outline. */
export default function Loading() {
  return <div className="space-y-8" aria-busy="true" aria-label="Loading"><HeaderSkeleton /><RowsSkeleton rows={5} /></div>;
}
