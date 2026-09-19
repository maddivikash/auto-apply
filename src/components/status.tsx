import type { ApplicationStatus } from "@/lib/store";

export const LABEL: Record<ApplicationStatus, string> = {
  queued: "Queued", fetching: "Reading job", tailoring: "Writing resume", rendering: "Rendering PDF",
  unsupported: "Not supported", ready: "Ready for review", approved: "Waiting for runner", filling: "Filling form",
  filled: "Awaiting your Submit", submit_requested: "Submitting", code_required: "Enter the email code", submitted: "Submitted", failed: "Failed"
};
export const IN_PROGRESS: ApplicationStatus[] = ["queued", "fetching", "tailoring", "rendering", "approved", "filling", "submit_requested"];

type Tone = "neutral" | "accent" | "go" | "signal" | "danger" | "done";
const TONE: Record<ApplicationStatus, Tone> = {
  queued: "neutral", fetching: "accent", tailoring: "accent", rendering: "accent",
  unsupported: "signal", ready: "go", approved: "accent", filling: "accent",
  filled: "signal", submit_requested: "accent", code_required: "signal", submitted: "done", failed: "danger"
};
const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  accent: "bg-accent-soft text-accent",
  go: "bg-go-soft text-go",
  signal: "bg-signal-soft text-signal",
  danger: "bg-danger-soft text-danger",
  done: "bg-go text-white"
};
export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`pill ${TONE_CLASS[TONE[status]]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${IN_PROGRESS.includes(status) ? "pulse-soft" : ""}`} />
      {LABEL[status]}
    </span>
  );
}

const STAGES = ["Read", "Resume", "Answers", "Filled", "Submitted"] as const;
export function stageIndex(status: ApplicationStatus, needsDetails: boolean): number {
  if (status === "submitted") return 5;
  if (["filled", "submit_requested", "code_required"].includes(status)) return 4;
  if (["approved", "filling"].includes(status)) return 3;
  if (status === "ready") return needsDetails ? 2 : 3;
  if (["tailoring", "rendering"].includes(status)) return 1;
  return 0;
}

/**
 * The five stages as a rail. Done segments are solid, the live one glows, the rest wait.
 * This is the product's one visual idea, reused from the brand mark to every list row.
 */
export function StageTrack({ status, needsDetails, compact = false, labels = !compact }: { status: ApplicationStatus; needsDetails: boolean; compact?: boolean; labels?: boolean }) {
  const done = stageIndex(status, needsDetails);
  const failed = status === "failed" || status === "unsupported";
  const live = IN_PROGRESS.includes(status);
  return (
    <ol className={`flex ${compact ? "w-28 gap-1" : "w-full max-w-md gap-1.5"}`} aria-label={`Stage ${done} of 5`}>
      {STAGES.map((s, i) => {
        const filled = i < done, active = i === done;
        const color = failed && active ? "bg-danger" : filled ? "bg-go" : active ? (status === "ready" && !needsDetails ? "bg-go" : "bg-signal") : "bg-line-strong";
        return (
          <li key={s} className="flex flex-1 flex-col gap-1.5">
            <span className={`block rounded-full ${compact ? "h-1" : "h-[5px]"} ${color} ${active && live ? "pulse-soft" : ""} ${active && !failed ? "shadow-[0_0_12px_var(--glow)]" : ""}`} />
            {labels && <span className={`text-[11px] leading-none ${filled || active ? "text-fg" : "text-faint"}`}>{s}</span>}
          </li>
        );
      })}
    </ol>
  );
}
