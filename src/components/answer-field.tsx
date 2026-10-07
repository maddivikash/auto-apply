"use client";
import { useState } from "react";

/**
 * One standing answer. Fields almost every form asks for are marked Required, and while empty they
 * carry a red outline so a gap is visible at a glance; it clears as soon as something is typed.
 */
export function AnswerField({ name, label, defaultValue, placeholder, essential, className = "" }: { name: string; label: string; defaultValue: string; placeholder?: string; essential?: boolean; className?: string }) {
  const [value, setValue] = useState(defaultValue);
  const missing = essential && !value.trim();
  return (
    <label className={`text-[13px] ${className}`} htmlFor={`answer-${name}`}>
      <span className="flex items-center justify-between gap-2">
        <span className={missing ? "text-danger" : "text-muted"}>{label}</span>
        {essential && <span className={`rounded-full px-1.5 py-[1px] text-[10.5px] font-medium ${missing ? "bg-danger-soft text-danger" : "bg-go-soft text-go"}`}>{missing ? "Required" : "✓ Required"}</span>}
      </span>
      <input id={`answer-${name}`} name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} aria-invalid={missing || undefined} data-missing={missing || undefined}
        className={`field mt-1.5 ${missing ? "!border-danger bg-danger-soft/40 focus:!ring-danger/15" : ""}`} />
      {missing && <span className="mt-1 block text-[11.5px] text-danger">Most forms ask this. Fill it once and it is never asked again.</span>}
    </label>
  );
}

/** "3 answers most forms ask for are empty" with a button that jumps to the first one. */
export function MissingSummary({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  const jump = () => {
    const el = document.querySelector<HTMLInputElement>('[data-missing="true"]');
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => el?.focus({ preventScroll: true }), 400);
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-ctl)] bg-danger-soft px-4 py-3 text-[13.5px]">
      <p><span className="font-medium text-danger">{labels.length} answer{labels.length > 1 ? "s" : ""} most forms ask for {labels.length > 1 ? "are" : "is"} empty</span><span className="text-muted">, marked in red below: {labels.join(", ")}.</span></p>
      <button type="button" onClick={jump} className="btn-ghost h-8 text-[12.5px]">Fill the first one</button>
    </div>
  );
}
