"use client";
import { useState, useTransition } from "react";
import { FREE_APPLICATIONS, type Plan } from "@/lib/plans";

/**
 * Shown once, right after the user's free applications are submitted. Closing it records that it was
 * seen so it does not return.
 */
export function PlanOffer({ plans, dismiss }: { plans: Plan[]; dismiss: () => Promise<void> }) {
  const [open, setOpen] = useState(true);
  const [, start] = useTransition();
  if (!open) return null;
  const close = () => { setOpen(false); start(() => dismiss()); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071a31]/50 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="plan-offer-title" onClick={close}>
      <div className="panel w-full max-w-[640px] p-7" onClick={(e) => e.stopPropagation()}>
        <span className="pill bg-go-soft text-go">{FREE_APPLICATIONS} of {FREE_APPLICATIONS} free applications submitted</span>
        <h2 id="plan-offer-title" className="mt-4 text-[24px] font-semibold leading-tight tracking-[-0.02em]">You can now apply to the rest.</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">Your free applications went out. Keep going with the Application Sprint: 50 applications in 14 days, each with its own tailored resume and answers you approve. One payment, no subscription.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {plans.map((p) => (
            <div key={p.region} className="rounded-[var(--radius-ctl)] border border-line p-5">
              <span className="text-[12.5px] text-muted">{p.region}</span>
              <div className="mt-1 flex items-baseline gap-2.5"><span className="display text-[34px]">{p.price}</span><s className="text-[14px] text-faint">{p.regular}</s></div>
              <span className="text-[12.5px] text-muted">one-time, 50 applications, 14 days</span>
              <a href={p.href || "/sprint#request"} className="btn-primary mt-5 w-full">Continue applying</a>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end"><button type="button" onClick={close} className="btn-quiet">Maybe later</button></div>
      </div>
    </div>
  );
}
