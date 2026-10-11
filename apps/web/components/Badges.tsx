import { VERIFICATION_LABELS, type ReportStatus, type VerificationStatus } from "@banabaconnect/shared";
import { scoreOutOf100 } from "@/lib/format";
import {
  PRIORITY_BAND_INK,
  PRIORITY_BAND_LABELS,
  STAFF_STATUS_LABELS,
  priorityBand,
} from "@/lib/labels";

/** Priority out of 100 with its band, e.g. "87 Critical". */
export function PriorityBadge({ score, size = "md" }: { score: number | null; size?: "md" | "lg" }) {
  const band = priorityBand(score);
  const color = PRIORITY_BAND_INK[band];
  return (
    <div className="flex items-center gap-2.5" title={`Priority ${scoreOutOf100(score)} of 100`}>
      <span
        className={`inline-flex items-center justify-center rounded-lg font-extrabold text-white tabular-nums ${
          size === "lg" ? "h-14 w-14 text-2xl" : "h-10 w-10 text-base"
        }`}
        style={{ backgroundColor: color }}
      >
        {scoreOutOf100(score)}
      </span>
      <span className="text-sm font-bold" style={{ color }}>
        {PRIORITY_BAND_LABELS[band]}
      </span>
    </div>
  );
}

const STATUS_STYLES: Record<ReportStatus, string> = {
  received: "bg-brand-soft text-brand",
  in_progress: "bg-warning-soft text-warning",
  resolved: "bg-success-soft text-success",
  invalid: "bg-line text-muted",
};

export function StatusPill({ status }: { status: ReportStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-bold ${STATUS_STYLES[status]}`}>
      {STAFF_STATUS_LABELS[status]}
    </span>
  );
}

const VERIFICATION_STYLES: Record<VerificationStatus, string> = {
  verified: "bg-success-soft text-success",
  pending: "bg-sun-soft text-ink",
  unverified: "bg-line text-muted",
  rejected: "bg-urgent-soft text-urgent",
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[13px] font-bold ${VERIFICATION_STYLES[status]}`}>
      {VERIFICATION_LABELS[status]}
    </span>
  );
}

export function GuestBadge() {
  return (
    <span className="inline-block rounded-full bg-line px-2 py-0.5 text-[13px] font-bold text-muted">Guest</span>
  );
}
