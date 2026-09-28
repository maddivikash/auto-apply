import { BrandMark } from "@/components/brand";

/** Shown the moment a page starts loading from outside the app shell, e.g. right after sign-up or sign-in. */
export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg text-muted" aria-busy="true">
      <BrandMark size={40} className="pulse-soft" />
      <p className="text-[13.5px]">Getting your workspace ready…</p>
    </main>
  );
}
