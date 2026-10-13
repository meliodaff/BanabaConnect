import Link from "next/link";
import { countWithStatus, type ReportCounts } from "@/lib/data";
import { STAFF_STATUS_LABELS, STATUS_FILTERS, type StatusFilter } from "@/lib/labels";

/**
 * The Reports page's status filter, as cards with how many reports each one shows. The summary
 * and the filter are one control, so the numbers are always the way into those reports. Like the
 * filter tabs on other pages, they're links that set ?status= (and keep the sort).
 */
export function ReportStatusCards({
  counts,
  current,
  keepQuery,
}: {
  counts: ReportCounts;
  current: StatusFilter;
  /** The sort to keep, e.g. "&sort=reported&dir=asc". */
  keepQuery: string;
}) {
  const { received, in_progress: inProgress } = counts.byStatus;
  const details: Record<StatusFilter, string> = {
    active: `${received} ${STAFF_STATUS_LABELS.received} · ${inProgress} ${STAFF_STATUS_LABELS.in_progress}`,
    resolved: `${counts.resolvedSince} today`,
    closed: "Not real, duplicate or spam",
    all: "Any status",
  };

  return (
    <nav aria-label="Report status" className="w-full">
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(STATUS_FILTERS) as StatusFilter[]).map((key) => {
          const selected = key === current;
          return (
            <li key={key}>
              <Link
                href={`/reports?status=${key}${keepQuery}`}
                aria-current={selected ? "page" : undefined}
                className={`block h-full rounded-lg border px-4 py-3 transition ${
                  selected ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-line bg-surface hover:border-brand"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={`text-[15px] font-bold leading-5 ${selected ? "text-brand" : "text-ink"}`}>
                    {STATUS_FILTERS[key].label}
                  </span>
                  {/* Same rule as Overview's "Urgent, not yet handled". */}
                  {key === "active" && counts.urgentWaiting > 0 && (
                    <span
                      title="Critical or High priority, still Received"
                      className="flex items-center gap-1.5 text-[13px] font-bold leading-5 text-ink"
                    >
                      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-urgent" />
                      {counts.urgentWaiting} urgent waiting
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-3xl font-bold leading-9 tabular-nums text-ink">
                  {countWithStatus(counts, STATUS_FILTERS[key].statuses).toLocaleString("en-PH")}
                </span>
                <span className="block text-sm leading-5 text-muted">{details[key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
