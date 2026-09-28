"use client";
import { useEffect, useState } from "react";

/** "required" beside a form question, hidden as soon as its field has a value, before any save. */
export function RequiredTag({ htmlFor, initiallyEmpty }: { htmlFor: string; initiallyEmpty: boolean }) {
  const [empty, setEmpty] = useState(initiallyEmpty);
  useEffect(() => {
    const el = document.getElementById(htmlFor) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (!el) return;
    const sync = () => setEmpty(!el.value.trim());
    el.addEventListener("input", sync); el.addEventListener("change", sync);
    return () => { el.removeEventListener("input", sync); el.removeEventListener("change", sync); };
  }, [htmlFor]);
  return empty ? <span className="text-danger">required</span> : null;
}
