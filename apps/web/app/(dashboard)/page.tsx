import { ACTIVE_REPORT_STATUSES, REPORT_CATEGORIES } from "@banabaconnect/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { OutsideBanabaTag, PriorityBadge, StatusPill } from "@/components/Badges";
import { BarList } from "@/components/BarList";
import { LiveRefresh } from "@/components/LiveRefresh";
import { PageHeader } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
import {
  countPendingVerifications,
  countReportsSince,
  listReports,
  type ReportSummary,
} from "@/lib/data";
import { startOfTodayInManila } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n-server";
import { priorityBand } from "@/lib/labels";
import { DEFAULT_SORT, sortReports } from "@/lib/reportSort";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).overview.title };
}

const MOST_URGENT = 5;
const MULTI_REPORT_INCIDENTS = 5;

function reporterLabel(report: ReportSummary, t: Dictionary) {
  return !report.reporter || report.reporter.isGuest
    ? t.common.guestReporter
    : (report.reporter.name ?? t.common.resident);
}

/** Incidents more than one person reported, biggest first, each shown by its most urgent report. */
function multiReportIncidents(active: ReportSummary[]) {
  const byIncident = new Map<string, ReportSummary>();
  for (const report of active) {
    if (!report.clusterId || report.clusterCount < 2) continue;
    const current = byIncident.get(report.clusterId);
    if (!current || (report.priority ?? 0) > (current.priority ?? 0)) {
      byIncident.set(report.clusterId, report);
    }
  }
  return [...byIncident.values()]
    .sort((a, b) => b.clusterCount - a.clusterCount || (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, MULTI_REPORT_INCIDENTS);
}

export default async function OverviewPage() {
  const [active, pendingIds, today, t] = await Promise.all([
    listReports([...ACTIVE_REPORT_STATUSES]),
    countPendingVerifications(),
    countReportsSince(startOfTodayInManila()),
    getDictionary(),
  ]);

  // "Urgent" = Critical or High priority that nobody has started on yet.
  const urgentWaiting = active.filter(
    (r) => r.status === "received" && ["critical", "high"].includes(priorityBand(r.priority)),
  );
  const oldestUrgent = urgentWaiting.reduce<ReportSummary | null>(
    (oldest, r) => (!oldest || r.receivedAt < oldest.receivedAt ? r : oldest),
    null,
  );
  const inProgress = active.filter((r) => r.status === "dispatched" || r.status === "in_progress").length;
  // Same order as the Reports list: highest priority, then reports from inside Banaba, then newest.
  const mostUrgent = sortReports(active, DEFAULT_SORT).slice(0, MOST_URGENT);
  const incidents = multiReportIncidents(active);
  const byType = REPORT_CATEGORIES.map((category) => ({
    label: t.category[category],
    value: active.filter((r) => r.category === category).length,
  }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader title={t.overview.title} description={t.overview.description}>
        <LiveRefresh />
      </PageHeader>

      <div className="space-y-6 px-8 py-6">
        <section aria-label={t.overview.workWaiting} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label={t.overview.urgent}
            value={urgentWaiting.length}
            detail={
              oldestUrgent ? t.overview.urgentOldest(t.time.since(oldestUrgent.receivedAt)) : t.overview.urgentNone
            }
            href="/reports?status=active&only=urgent"
            action={t.overview.seeUrgent}
            accent={urgentWaiting.length > 0 ? "urgent" : "none"}
          />
          <StatTile
            label={t.overview.handling}
            value={inProgress}
            detail={t.overview.handlingDetail}
            href="/reports?status=active&only=handling"
            action={t.overview.seeHandling}
          />
          <StatTile
            label={t.overview.ids}
            value={pendingIds}
            detail={t.overview.idsDetail}
            href="/residents"
            action={t.overview.reviewIds}
            accent={pendingIds > 0 ? "waiting" : "none"}
          />
          <StatTile
            label={t.overview.today}
            value={today.received}
            detail={t.overview.todayDetail(today.resolved)}
            href="/reports?status=all&date=today"
            action={t.overview.seeToday}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section className="rounded-lg border border-line bg-surface p-5" aria-labelledby="most-urgent">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="most-urgent" className="text-base font-bold">
                {t.overview.mostUrgent}
              </h2>
              <Link href="/reports?status=active" className="text-sm font-bold text-brand hover:underline">
                {t.overview.seeAllActive}
              </Link>
            </div>
            {mostUrgent.length === 0 ? (
              <p className="py-10 text-center text-[15px] text-muted">{t.overview.noActive}</p>
            ) : (
              <ul className="divide-y divide-line">
                {mostUrgent.map((report) => (
                  <li key={report.id}>
                    <Link
                      href={`/reports/${report.id}?from=overview`}
                      className="grid grid-cols-[150px_minmax(0,1fr)_auto] items-center gap-4 py-3 hover:bg-brand-soft/50"
                    >
                      <PriorityBadge score={report.priority} />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 text-base font-bold">
                          {t.category[report.category]}
                          {report.outsideBanabaM !== null && (
                            <OutsideBanabaTag meters={report.outsideBanabaM} />
                          )}
                        </span>
                        <span className="block truncate text-sm text-muted">
                          {reporterLabel(report, t)} · {t.time.ago(report.createdAt)}
                          {report.clusterCount > 1 && ` · ${t.nearby.others(report.clusterCount)}`}
                        </span>
                      </span>
                      <StatusPill status={report.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="space-y-6">
            <section className="rounded-lg border border-line bg-surface p-5" aria-labelledby="several">
              <h2 id="several" className="text-base font-bold">
                {t.overview.several}
              </h2>
              <p className="mb-3 text-sm text-muted">{t.overview.severalHint}</p>
              {incidents.length === 0 ? (
                <p className="py-4 text-[15px] text-muted">{t.overview.severalNone}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {incidents.map((report) => (
                    <li key={report.clusterId}>
                      <Link
                        href={`/reports/${report.id}?from=overview`}
                        className="flex items-center justify-between gap-3 py-3 hover:text-brand"
                      >
                        <span className="min-w-0">
                          <span className="block text-[15px] font-bold">
                            {t.overview.severalLine(t.category[report.category], report.clusterCount)}
                          </span>
                          <span className="block text-sm text-muted">
                            {t.overview.mostUrgentOne(t.time.ago(report.createdAt))}
                          </span>
                        </span>
                        <StatusPill status={report.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-line bg-surface p-5" aria-labelledby="by-type">
              <h2 id="by-type" className="text-base font-bold">
                {t.overview.byType}
              </h2>
              <p className="mb-4 text-sm text-muted">{t.overview.byTypeHint}</p>
              {byType.length === 0 ? (
                <p className="py-4 text-[15px] text-muted">{t.overview.byTypeNone}</p>
              ) : (
                <BarList label={t.overview.byType} rows={byType} />
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
