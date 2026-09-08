import type { ApplicationStatus } from "@/lib/store";

const STYLE: Record<ApplicationStatus, string> = {
  queued: "bg-neutral-100 text-neutral-700",
  fetching: "bg-blue-50 text-blue-700",
  tailoring: "bg-blue-50 text-blue-700",
  rendering: "bg-blue-50 text-blue-700",
  unsupported: "bg-amber-50 text-amber-800",
  ready: "bg-emerald-50 text-emerald-700",
  approved: "bg-violet-50 text-violet-700",
  filling: "bg-violet-50 text-violet-700",
  filled: "bg-violet-50 text-violet-700",
  submit_requested: "bg-violet-50 text-violet-700",
  submitted: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-50 text-red-700"
};
export const LABEL: Record<ApplicationStatus, string> = {
  queued: "Queued", fetching: "Reading job", tailoring: "Writing resume", rendering: "Rendering PDF",
  unsupported: "Not supported", ready: "Resume ready", approved: "Approved, waiting for runner", filling: "Filling form",
  filled: "Form filled, awaiting your Submit", submit_requested: "Submitting", submitted: "Submitted", failed: "Failed"
};
export const IN_PROGRESS: ApplicationStatus[] = ["queued", "fetching", "tailoring", "rendering", "approved", "filling", "submit_requested"];

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[status]}`}>{LABEL[status]}</span>;
}
