import Link from "next/link";
import { countWithStatus, type ReportCounts } from "@/lib/data";
import { getDictionary } from "@/lib/i18n-server";
import { STATUS_FILTERS, type StatusFilter } from "@/lib/labels";

/**
 * The Reports page's status filter, as cards with how many reports each one shows. The summary
 * and the filter are one control, so the numbers are always the way into those reports. Like the
 * filter tabs on other pages, they're links that set ?status= (and keep the sort).
 */
export async function ReportStatusCards({
  counts,
  current,
  keepQuery,
}: {
  counts: ReportCounts;
  current: StatusFilter;
  /** The sort and date filter to keep, e.g. "&sort=reported&dir=asc&date=today". */
  keepQuery: string;
}) {
  const t = await getDictionary();
  const details: Record<StatusFilter, string> = {
    active: t.cards.active(counts.byStatus.received, counts.byStatus.dispatched, counts.byStatus.in_progress),
    resolved: t.cards.resolved(counts.resolvedSince),
    closed: t.cards.closed,
    all: t.cards.all,
  };

  return (
    <nav aria-label={t.reports.statusLabel} className="w-full">
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
                    {t.filters[key]}
                  </span>
                  {/* Same rule as Overview's "Urgent, not yet handled". */}
                  {key === "active" && counts.urgentWaiting > 0 && (
                    <span
                      title={t.cards.urgentTitle}
                      className="flex items-center gap-1.5 text-[13px] font-bold leading-5 text-ink"
                    >
                      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-urgent" />
                      {t.cards.urgentWaiting(counts.urgentWaiting)}
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
