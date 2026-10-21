import {
  ACTIVE_REPORT_STATUSES,
  REPORT_STATUSES,
  isReportCategory,
  type ReportCategory,
  type ReportStatus,
} from "@banabaconnect/shared";

/** Status names for barangay staff (residents see friendlier wording in the app). */
export const STAFF_STATUS_LABELS: Record<ReportStatus, string> = {
  received: "Received",
  dispatched: "Responders on the way",
  in_progress: "In progress",
  resolved: "Resolved",
  invalid: "Invalid",
};

export const STATUS_FILTERS = {
  active: { label: "Active", statuses: [...ACTIVE_REPORT_STATUSES] },
  resolved: { label: "Resolved", statuses: ["resolved"] },
  closed: { label: "Invalid", statuses: ["invalid"] },
  all: { label: "All", statuses: [...REPORT_STATUSES] },
} as const satisfies Record<string, { label: string; statuses: readonly ReportStatus[] }>;

export type StatusFilter = keyof typeof STATUS_FILTERS;

export function parseStatusFilter(value: unknown): StatusFilter {
  return typeof value === "string" && value in STATUS_FILTERS ? (value as StatusFilter) : "active";
}

/**
 * The Reports page's optional date filter, by when reports reached the barangay: ?date=today since
 * midnight, ?date=7d and ?date=30d over the last 7 or 30 days, counting today.
 */
export const DATE_FILTERS = ["today", "7d", "30d"] as const;
export type DateFilter = (typeof DATE_FILTERS)[number] | null;

const DATE_FILTER_DAYS: Record<Exclude<DateFilter, null>, number> = { today: 1, "7d": 7, "30d": 30 };

export function parseDateFilter(value: unknown): DateFilter {
  return (DATE_FILTERS as readonly unknown[]).includes(value) ? (value as DateFilter) : null;
}

/** When the date filter's reports start, from midnight today (Philippine time, which has no DST). */
export function dateFilterStart(date: DateFilter, todayIso: string): string | undefined {
  if (!date) return undefined;
  return new Date(Date.parse(todayIso) - (DATE_FILTER_DAYS[date] - 1) * 24 * 60 * 60 * 1000).toISOString();
}

export type OnlyFilter = "urgent" | "handling" | null;

export function parseOnlyFilter(value: unknown): OnlyFilter {
  return value === "urgent" || value === "handling" ? value : null;
}

export function parseTypeFilter(value: unknown): ReportCategory | null {
  return isReportCategory(value) ? value : null;
}

export function parseLevelFilter(value: unknown): PriorityBand | null {
  return typeof value === "string" && value in PRIORITY_BAND_RANGES ? (value as PriorityBand) : null;
}

/**
 * The Reports page's filters beyond status: the Overview's narrower views, and the dropdowns
 * above the list (type of incident, priority level and date).
 */
export interface ListFilters {
  only: OnlyFilter;
  type: ReportCategory | null;
  level: PriorityBand | null;
  date: DateFilter;
}

export function parseListFilters(params: Record<string, string | string[] | undefined>): ListFilters {
  return {
    only: parseOnlyFilter(params.only),
    type: parseTypeFilter(params.type),
    level: parseLevelFilter(params.level),
    date: parseDateFilter(params.date),
  };
}

/** True when a dropdown narrows the list. */
export function hasDropdownFilter({ type, level, date }: ListFilters): boolean {
  return Boolean(type || level || date);
}

/** The filters as a query-string suffix, e.g. "&only=urgent&type=fire&date=today". */
export function filtersQuery({ only, type, level, date }: ListFilters): string {
  return `${only ? `&only=${only}` : ""}${type ? `&type=${type}` : ""}${level ? `&level=${level}` : ""}${
    date ? `&date=${date}` : ""
  }`;
}

/** The short number staff can write in a logbook: the start of the report's ID, e.g. 3F2A9C1D. */
export function reportNumber(id: string): string {
  return id.slice(0, 8).toUpperCase();
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

/** Where High priority starts. Critical and High together are "urgent" on Overview and Reports. */
export const HIGH_PRIORITY_MIN = 0.55;

/**
 * Narrower views of the Active list, opened from the Overview tiles with the same rules as their
 * numbers: ?only=urgent is Critical or High that nobody has started on; ?only=handling is
 * responders on the way or In progress.
 */
export const ONLY_FILTERS = {
  urgent: { statuses: ["received"], minPriority: HIGH_PRIORITY_MIN },
  handling: { statuses: ["dispatched", "in_progress"], minPriority: undefined },
} as const satisfies Record<
  Exclude<OnlyFilter, null>,
  { statuses: readonly ReportStatus[]; minPriority: number | undefined }
>;

/**
 * Groups the 0–1 priority score so staff can scan the queue. For example, a fire from a verified
 * resident is critical; a single road-blockage report from a guest is low.
 */
export function priorityBand(score: number | null): PriorityBand {
  if (score === null) return "low";
  if (score >= PRIORITY_BAND_RANGES.critical.min) return "critical";
  if (score >= PRIORITY_BAND_RANGES.high.min) return "high";
  if (score >= PRIORITY_BAND_RANGES.medium.min) return "medium";
  return "low";
}

/**
 * Each level's scores, for the priority filter: from `min`, up to but not including `below`.
 * Low also takes reports with no score yet, as priorityBand does.
 */
export const PRIORITY_BAND_RANGES = {
  critical: { min: 0.75, below: undefined },
  high: { min: HIGH_PRIORITY_MIN, below: 0.75 },
  medium: { min: 0.4, below: HIGH_PRIORITY_MIN },
  low: { min: undefined, below: 0.4 },
} as const satisfies Record<PriorityBand, { min: number | undefined; below: number | undefined }>;

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
