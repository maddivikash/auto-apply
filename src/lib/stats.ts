import type { Application } from "./store";

export function summarize(apps: Application[]) {
  const by = (pred: (a: Application) => boolean) => apps.filter(pred).length;
  return {
    total: apps.length,
    submitted: by((a) => a.status === "submitted"),
    awaitingSubmit: by((a) => a.status === "filled" || (a.status === "code_required" && !a.verificationCode)),
    needsDetails: by((a) => a.status === "ready" && a.questions.some((q) => q.needsHuman && !q.answer)),
    readyToApprove: by((a) => a.status === "ready" && !a.questions.some((q) => q.needsHuman && !q.answer)),
    inProgress: by((a) => ["queued", "fetching", "tailoring", "rendering", "approved", "filling", "submit_requested"].includes(a.status) || (a.status === "code_required" && !!a.verificationCode)),
    failed: by((a) => a.status === "failed"),
    unsupported: by((a) => a.status === "unsupported")
  };
}
export const openQuestions = (a: Application) => a.questions.filter((q) => q.needsHuman && !q.answer);
