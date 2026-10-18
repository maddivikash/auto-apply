import type { Application } from "./store";

export function summarize(apps: Application[]) {
  const by = (pred: (a: Application) => boolean) => apps.filter(pred).length;
  return {
    total: apps.length,
    submitted: by((a) => a.status === "submitted"),
    awaitingSubmit: by((a) => (a.status === "filled" && !blockedBeforeSubmit(a)) || (a.status === "code_required" && !a.verificationCode)),
    needsDetails: by((a) => (a.status === "ready" && a.questions.some((q) => q.needsHuman)) || blockedBeforeSubmit(a)),
    readyToApprove: by((a) => a.status === "ready" && !a.questions.some((q) => q.needsHuman)),
    inProgress: by((a) => ["queued", "fetching", "tailoring", "rendering", "approved", "filling", "submit_requested"].includes(a.status) || (a.status === "code_required" && !!a.verificationCode)),
    failed: by((a) => a.status === "failed"),
    unsupported: by((a) => a.status === "unsupported")
  };
}
export const openQuestions = (a: Application) => a.questions.filter((q) => q.needsHuman);
/** Filled, but the runner (or the site itself) named required fields it could not answer: Submit would only fail again. */
export const blockedBeforeSubmit = (a: Application) => a.status === "filled" && openQuestions(a).length > 0;
