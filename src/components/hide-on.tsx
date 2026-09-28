"use client";
import { usePathname } from "next/navigation";

/** Renders its children everywhere except on the given path, e.g. a nudge that the page itself already answers. */
export function HideOn({ path, children }: { path: string; children: React.ReactNode }) {
  return usePathname() === path ? null : <>{children}</>;
}
