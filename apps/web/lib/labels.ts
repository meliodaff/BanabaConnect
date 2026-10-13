import { REPORT_STATUSES, type ReportStatus } from "@banabaconnect/shared";

/** Status names for barangay staff (residents see friendlier wording in the app). */
export const STAFF_STATUS_LABELS: Record<ReportStatus, string> = {
  received: "Received",
  in_progress: "In progress",
  resolved: "Resolved",
  invalid: "Invalid",
};

export const STATUS_FILTERS = {
  active: { label: "Active", statuses: ["received", "in_progress"] },
  resolved: { label: "Resolved", statuses: ["resolved"] },
  closed: { label: "Invalid", statuses: ["invalid"] },
  all: { label: "All", statuses: [...REPORT_STATUSES] },
} as const satisfies Record<string, { label: string; statuses: readonly ReportStatus[] }>;

export type StatusFilter = keyof typeof STATUS_FILTERS;

export function parseStatusFilter(value: unknown): StatusFilter {
  return typeof value === "string" && value in STATUS_FILTERS ? (value as StatusFilter) : "active";
}

/**
 * The reports grouped with this one as the same incident, not counting it: "2 other reports" when
 * three were grouped. For reports with a clusterCount above 1 (which includes the report itself).
 */
export function otherReportsLabel(clusterCount: number): string {
  const others = clusterCount - 1;
  return others === 1 ? "1 other report" : `${others} other reports`;
}

/**
 * Hover text for the label above: how reports are grouped, and by how many people. The 150 m and
 * 2 hours are draft values from submit_report in supabase/migrations; change this with them.
 */
export function groupedReportsHint(clusterPeople: number): string {
  const rule = "Same kind of incident within 150 m and 2 hours";
  if (clusterPeople < 1) return rule;
  return `${rule} · reported by ${clusterPeople === 1 ? "1 person" : `${clusterPeople} people`}`;
}

export type PriorityBand = "critical" | "high" | "medium" | "low";

/**
 * Groups the 0–1 priority score so staff can scan the queue. For example, a fire from a verified
 * resident is critical; a single road-blockage report from a guest is low.
 */
export function priorityBand(score: number | null): PriorityBand {
  if (score === null) return "low";
  if (score >= 0.75) return "critical";
  if (score >= 0.55) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

export const PRIORITY_BAND_LABELS: Record<PriorityBand, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/**
 * One color per priority level, used everywhere: map pins, the map legend, and the priority
 * badges below. A clearly different color per level lets staff tell levels apart at a glance;
 * the project owner chose this over the single red ramp in .claude/skills/anti-slop-status-colors.
 * Ordered dark red → orange → yellow → gray, so urgency still reads from strong to quiet; pins
 * also get a dark outline so yellow and gray show on the light map.
 */
export const PRIORITY_BAND_COLORS: Record<PriorityBand, string> = {
  critical: "#730910",
  high: "#E65100",
  medium: "#F5B800",
  low: "#8C95A3",
};

/**
 * The priority badge: filled with the level's map color, so a report looks the same on Overview,
 * the Reports list, its own page and the map. Every number is at least 4.5:1 against its fill
 * (white on dark red; ink, --color-ink, on the lighter orange, yellow and gray).
 */
export const PRIORITY_BADGES: Record<PriorityBand, { fill: string; border: string; number: string }> = {
  critical: { fill: PRIORITY_BAND_COLORS.critical, border: PRIORITY_BAND_COLORS.critical, number: "#FFFFFF" },
  high: { fill: PRIORITY_BAND_COLORS.high, border: PRIORITY_BAND_COLORS.high, number: "#141A26" },
  medium: { fill: PRIORITY_BAND_COLORS.medium, border: PRIORITY_BAND_COLORS.medium, number: "#141A26" },
  low: { fill: PRIORITY_BAND_COLORS.low, border: PRIORITY_BAND_COLORS.low, number: "#141A26" },
};
