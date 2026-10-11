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
 * Priority is one ordered scale, so it's one hue from light to dark (darker = more urgent),
 * never a traffic-light rainbow. Passes the dataviz validator's ordinal checks
 * (`validate_palette.js --ordinal`). Used for map pins and the map legend.
 * See .claude/skills/anti-slop-status-colors.
 */
export const PRIORITY_BAND_COLORS: Record<PriorityBand, string> = {
  critical: "#730910",
  high: "#B5111A",
  medium: "#D9464E",
  low: "#E98A8F",
};

/** The priority badge on each step; every number is at least 4.5:1 against its fill. */
export const PRIORITY_BADGES: Record<PriorityBand, { fill: string; border: string; number: string }> = {
  critical: { fill: "#730910", border: "#730910", number: "#FFFFFF" },
  high: { fill: "#B5111A", border: "#B5111A", number: "#FFFFFF" },
  medium: { fill: "#FBE3E4", border: "#E98A8F", number: "#8E0B12" },
  low: { fill: "#FFFFFF", border: "#E98A8F", number: "#4D5668" },
};
