import { CATEGORY_LABELS, REPORT_STATUSES, type ReportCategory } from "@banabaconnect/shared";
import type { ReportSummary } from "@/lib/data";

/**
 * Sorting for the Reports list. The sort lives in the URL (?sort=reported&dir=asc), like the
 * status filter, so refreshing, the back button, shared links and live updates all keep it.
 * Highest priority first is the default and leaves the URL clean.
 */

export const SORT_KEYS = ["priority", "report", "reporter", "nearby", "reported", "status"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDirection = "asc" | "desc";

export interface ReportSort {
  key: SortKey;
  dir: SortDirection;
}

export const DEFAULT_SORT: ReportSort = { key: "priority", dir: "desc" };

/** The order a column sorts in on its first click: the one staff usually want. */
const FIRST_DIRECTION: Record<SortKey, SortDirection> = {
  priority: "desc",
  report: "asc",
  reporter: "asc",
  nearby: "desc",
  reported: "desc",
  status: "asc",
};

export function parseSort(sort: unknown, dir: unknown): ReportSort {
  if (typeof sort !== "string" || !(SORT_KEYS as readonly string[]).includes(sort)) {
    return DEFAULT_SORT;
  }
  const key = sort as SortKey;
  return { key, dir: dir === "asc" || dir === "desc" ? dir : FIRST_DIRECTION[key] };
}

export function isDefaultSort(sort: ReportSort) {
  return sort.key === DEFAULT_SORT.key && sort.dir === DEFAULT_SORT.dir;
}

/** "&sort=…&dir=…" to add to a /reports URL, or "" for the default order. */
export function sortQuery(sort: ReportSort) {
  return isDefaultSort(sort) ? "" : `&sort=${sort.key}&dir=${sort.dir}`;
}

/** Clicking the current column reverses it; any other column starts in its usual order. */
export function nextSort(current: ReportSort, key: SortKey): ReportSort {
  if (current.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { key, dir: FIRST_DIRECTION[key] };
}

const STATUS_ORDER = new Map(REPORT_STATUSES.map((status, index) => [status, index]));

function reporterName(report: ReportSummary): string | null {
  if (!report.reporter || report.reporter.isGuest) return null;
  return report.reporter.name ?? "Resident";
}

/**
 * Ties go to the higher priority, then reports from inside Banaba (an "Outside Banaba" report
 * never pushes down a local one with the same score), then the newer report.
 */
function tieBreak(a: ReportSummary, b: ReportSummary) {
  return (
    (b.priority ?? -1) - (a.priority ?? -1) ||
    Number(a.outsideBanabaM !== null) - Number(b.outsideBanabaM !== null) ||
    b.createdAt.localeCompare(a.createdAt)
  );
}

/**
 * `categoryLabels` are the type names staff see, so "Report type, A to Z" follows the screen
 * (Filipino names sort differently from the English ones).
 */
export function sortReports(
  reports: ReportSummary[],
  sort: ReportSort,
  categoryLabels: Record<ReportCategory, string> = CATEGORY_LABELS,
): ReportSummary[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  const compare = (a: ReportSummary, b: ReportSummary): number => {
    switch (sort.key) {
      case "priority":
        return sign * ((a.priority ?? -1) - (b.priority ?? -1));
      case "report":
        return sign * categoryLabels[a.category].localeCompare(categoryLabels[b.category]);
      case "reporter": {
        // Guests have no name to sort by, so they stay at the end either way.
        const nameA = reporterName(a);
        const nameB = reporterName(b);
        if (nameA === null || nameB === null) return (nameA === null ? 1 : 0) - (nameB === null ? 1 : 0);
        return sign * nameA.localeCompare(nameB);
      }
      case "nearby":
        return sign * (a.clusterCount - b.clusterCount);
      case "reported":
        return sign * a.createdAt.localeCompare(b.createdAt);
      case "status":
        return sign * ((STATUS_ORDER.get(a.status) ?? 0) - (STATUS_ORDER.get(b.status) ?? 0));
    }
  };
  return [...reports].sort((a, b) => compare(a, b) || tieBreak(a, b));
}
