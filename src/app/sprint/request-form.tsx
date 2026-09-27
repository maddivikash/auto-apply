"use client";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { requestSprintAction, type SprintRequestState } from "./actions";

export function RequestForm() {
  const [state, action] = useActionState<SprintRequestState, FormData>(requestSprintAction, null);
  if (state?.ok) {
    return (
      <div className="border border-go/40 bg-go-soft p-6">
        <h3 className="text-[16px] font-semibold">Got it. Your 3 free applications are on the way.</h3>
        <p className="mt-1.5 text-[14px] text-muted">Within a day you get an email with the 3 roles we picked and a link to set up your profile.</p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="text-[13px]"><span className="block font-medium">Name</span><input name="name" autoComplete="name" className="field mt-1.5" /></label>
      <label className="text-[13px]"><span className="block font-medium">Email *</span><input name="email" type="email" required autoComplete="email" className="field mt-1.5" /></label>
      <label className="text-[13px]"><span className="block font-medium">Country you live in</span><input name="country" autoComplete="country-name" placeholder="India" className="field mt-1.5" /></label>
      <label className="text-[13px]"><span className="block font-medium">Years of experience</span>
        <select name="experience" className="field mt-1.5" defaultValue="1-3"><option value="0-1">Under 1 year</option><option value="1-3">1 to 3 years</option><option value="3-5">3 to 5 years</option><option value="5+">5+ years</option></select>
      </label>
      <label className="text-[13px] sm:col-span-2"><span className="block font-medium">Roles you are applying for *</span><input name="roles" required placeholder="Backend engineer, full-stack, remote or Bengaluru" className="field mt-1.5" /></label>
      <label className="text-[13px] sm:col-span-2"><span className="block font-medium">Anything we should know</span><textarea name="note" rows={3} placeholder="Notice period, visa, companies you want or want to avoid" className="field mt-1.5" /></label>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <SubmitButton pending="Sending" className="btn-primary btn-lg">Get my 3 free applications</SubmitButton>
        {state?.error && <p className="text-[13px] text-danger">{state.error}</p>}
      </div>
    </form>
  );
}
