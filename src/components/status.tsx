import type { ApplicationStatus } from "@/lib/store";

export const LABEL: Record<ApplicationStatus, string> = {
  queued: "Queued", fetching: "Reading job", tailoring: "Writing resume", rendering: "Rendering PDF",
  unsupported: "Not supported", ready: "Ready for review", approved: "Waiting for runner", filling: "Filling form",
  filled: "Awaiting your Submit", submit_requested: "Submitting", submitted: "Submitted", failed: "Failed"
};
export const IN_PROGRESS: ApplicationStatus[] = ["queued", "fetching", "tailoring", "rendering", "approved", "filling", "submit_requested"];
const TONE: Record<ApplicationStatus, string> = {
  queued: "bg-tint text-muted", fetching: "bg-brand-soft text-brand", tailoring: "bg-brand-soft text-brand", rendering: "bg-brand-soft text-brand",
  unsupported: "bg-signal-soft text-signal", ready: "bg-go-soft text-go", approved: "bg-brand-soft text-brand", filling: "bg-brand-soft text-brand",
  filled: "bg-signal-soft text-signal", submit_requested: "bg-brand-soft text-brand", submitted: "bg-go text-white", failed: "bg-danger-soft text-danger"
};
export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TONE[status]}`}>{IN_PROGRESS.includes(status) && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}{LABEL[status]}</span>;
}

const STAGES = ["Read", "Resume", "Answers", "Filled", "Submitted"] as const;
export function stageIndex(status: ApplicationStatus, needsDetails: boolean): number {
  if (status === "submitted") return 5;
  if (["filled", "submit_requested"].includes(status)) return 4;
  if (["approved", "filling"].includes(status)) return 3;
  if (status === "ready") return needsDetails ? 2 : 3;
  if (["tailoring", "rendering"].includes(status)) return 1;
  return 0;
}
/** Five stages drawn as a track. The one visual idea the product leans on. */
export function StageTrack({ status, needsDetails, compact = false }: { status: ApplicationStatus; needsDetails: boolean; compact?: boolean }) {
  const done = stageIndex(status, needsDetails);
  const failed = status === "failed" || status === "unsupported";
  return (
    <ol className={`flex items-center ${compact ? "gap-1.5" : "gap-3"}`} aria-label={`Stage ${done} of 5`}>
      {STAGES.map((s, i) => {
        const filled = i < done, active = i === done && !failed;
        return (
          <li key={s} className="flex flex-col gap-1.5">
            <span className={`block rounded-full ${compact ? "h-1.5 w-7" : "h-2 w-14"} ${failed && i === done ? "bg-danger" : filled ? "bg-go" : active ? "bg-signal" : "bg-line"}`} />
            {!compact && <span className={`text-[11px] ${filled || active ? "text-ink" : "text-muted"}`}>{s}</span>}
          </li>
        );
      })}
    </ol>
  );
}
