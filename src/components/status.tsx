import type { ApplicationStatus } from "@/lib/store";

export const LABEL: Record<ApplicationStatus, string> = {
  queued: "Queued", fetching: "Reading job", tailoring: "Writing resume", rendering: "Rendering PDF",
  unsupported: "Not supported", ready: "Ready for review", approved: "Waiting for runner", filling: "Filling form",
  filled: "Awaiting your Submit", submit_requested: "Submitting", submitted: "Submitted", failed: "Failed"
};
export const IN_PROGRESS: ApplicationStatus[] = ["queued", "fetching", "tailoring", "rendering", "approved", "filling", "submit_requested"];
const TONE: Record<ApplicationStatus, string> = {
  queued: "bg-tint text-muted", fetching: "bg-tint text-ink", tailoring: "bg-tint text-ink", rendering: "bg-tint text-ink",
  unsupported: "bg-signal-soft text-signal", ready: "bg-go-soft text-go", approved: "bg-tint text-ink", filling: "bg-tint text-ink",
  filled: "bg-signal-soft text-signal", submit_requested: "bg-tint text-ink", submitted: "bg-go text-white", failed: "bg-danger-soft text-danger"
};
export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[status]}`}>{IN_PROGRESS.includes(status) && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}{LABEL[status]}</span>;
}

/** Five stages drawn as a track. This is the one visual idea the product leans on. */
const STAGES = ["Read", "Resume", "Answers", "Filled", "Submitted"] as const;
export function stageIndex(status: ApplicationStatus, needsDetails: boolean): number {
  if (status === "submitted") return 5;
  if (["filled", "submit_requested"].includes(status)) return 4;
  if (["approved", "filling"].includes(status)) return 3;
  if (status === "ready") return needsDetails ? 2 : 3;
  if (["tailoring", "rendering"].includes(status)) return 1;
  return 0;
}
export function StageTrack({ status, needsDetails, compact = false }: { status: ApplicationStatus; needsDetails: boolean; compact?: boolean }) {
  const done = stageIndex(status, needsDetails);
  const failed = status === "failed" || status === "unsupported";
  return (
    <ol className={`flex items-center ${compact ? "gap-1" : "gap-2"}`} aria-label={`Stage ${done} of 5`}>
      {STAGES.map((s, i) => {
        const filled = i < done;
        const active = i === done && !failed;
        return (
          <li key={s} className="flex items-center gap-1">
            <span className={`block rounded-full ${compact ? "h-2 w-6" : "h-2.5 w-10"} ${failed && i === done ? "bg-danger" : filled ? "bg-go" : active ? "bg-signal" : "bg-line"}`} title={s} />
            {!compact && <span className={`text-[11px] ${filled || active ? "text-ink" : "text-muted"}`}>{s}</span>}
          </li>
        );
      })}
    </ol>
  );
}
