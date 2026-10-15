import { CATEGORY_LABELS, isActiveReportStatus, REPORT_STATUSES, type ReportCategory, type ReportStatus } from "@banabaconnect/shared";
import type { ReportWithResponse } from "@/lib/data";
import { priorityBand, type PriorityBand } from "@/lib/labels";

/** One line of "By type": how many reports of a kind came in and where they stand now. */
export interface TypeLine {
  category: ReportCategory;
  label: string;
  total: number;
  resolved: number;
  /** Received, responders on the way, or In progress. */
  open: number;
  invalid: number;
}

/** A typical duration: the median, and how many reports it's based on. */
export interface Typical {
  medianMs: number | null;
  count: number;
}

export interface MonthSummary {
  total: number;
  byStatus: Record<ReportStatus, number>;
  /** Received, responders on the way, or In progress. */
  open: number;
  byType: TypeLine[];
  /** Priority of the reports that aren't Invalid (Invalid ones aren't real incidents). */
  byPriority: Record<PriorityBand, number>;
  reporters: { verified: number; notVerified: number; guest: number };
  outsideBanaba: number;
  /** From reaching the barangay to dispatch, handling, or resolution by staff. */
  toFirstAction: Typical;
  /** From reaching the barangay to Resolved, for the reports that are resolved now. */
  toResolved: Typical;
}

/** The numbers for the monthly report. Statuses and priorities are as they are now. */
export function summarizeMonth(reports: ReportWithResponse[]): MonthSummary {
  const byStatus = Object.fromEntries(REPORT_STATUSES.map((status) => [status, 0])) as Record<ReportStatus, number>;
  const byPriority: Record<PriorityBand, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const reporters = { verified: 0, notVerified: 0, guest: 0 };
  const types = new Map<ReportCategory, TypeLine>();
  const firstActions: number[] = [];
  const resolutions: number[] = [];
  let outsideBanaba = 0;

  for (const report of reports) {
    byStatus[report.status] += 1;
    const open = isActiveReportStatus(report.status);

    const line = types.get(report.category) ?? {
      category: report.category,
      label: CATEGORY_LABELS[report.category],
      total: 0,
      resolved: 0,
      open: 0,
      invalid: 0,
    };
    line.total += 1;
    if (report.status === "resolved") line.resolved += 1;
    if (report.status === "invalid") line.invalid += 1;
    if (open) line.open += 1;
    types.set(report.category, line);

    if (report.status !== "invalid") byPriority[priorityBand(report.priority)] += 1;

    if (!report.reporter || report.reporter.isGuest) reporters.guest += 1;
    else if (report.reporter.verification === "verified") reporters.verified += 1;
    else reporters.notVerified += 1;

    if (report.outsideBanabaM !== null) outsideBanaba += 1;

    const received = new Date(report.receivedAt).getTime();
    if (report.firstActionAt) firstActions.push(new Date(report.firstActionAt).getTime() - received);
    // statusUpdatedAt is when it last changed status, so when it was resolved.
    if (report.status === "resolved") resolutions.push(new Date(report.statusUpdatedAt).getTime() - received);
  }

  return {
    total: reports.length,
    byStatus,
    open: byStatus.received + byStatus.dispatched + byStatus.in_progress,
    byType: [...types.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)),
    byPriority,
    reporters,
    outsideBanaba,
    toFirstAction: typical(firstActions),
    toResolved: typical(resolutions),
  };
}

/** The median (the middle value: half are faster, half slower), which one slow night can't skew. */
function typical(durations: number[]): Typical {
  const sorted = durations.map((ms) => Math.max(0, ms)).sort((a, b) => a - b);
  if (sorted.length === 0) return { medianMs: null, count: 0 };
  const middle = Math.floor(sorted.length / 2);
  const medianMs = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return { medianMs, count: sorted.length };
}
