import { FormSectionSkeleton, HeaderSkeleton } from "@/components/skeletons";

export default function Loading() {
  return <div className="space-y-5" aria-busy="true" aria-label="Loading"><HeaderSkeleton /><FormSectionSkeleton fields={6} /><FormSectionSkeleton fields={4} /><FormSectionSkeleton fields={4} /></div>;
}
