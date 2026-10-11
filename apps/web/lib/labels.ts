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

/** Bright fills for map pins and the map legend (no text sits on them). */
export const PRIORITY_BAND_COLORS: Record<PriorityBand, string> = {
  critical: "#D7141A",
  high: "#F26B0F",
  medium: "#E8A400",
  low: "#2F6FDE",
};

/**
 * Darker shades of the same bands for anything with text: the priority badge (white numbers on
 * it) and the band name. Each is at least 4.5:1 against white, the page and the new-row yellow.
 */
export const PRIORITY_BAND_INK: Record<PriorityBand, string> = {
  critical: "#C8101A",
  high: "#B84A00",
  medium: "#8C5E00",
  low: "#1F5BC7",
};
