import { CATEGORY_LABELS, REPORT_CATEGORIES } from "@banabaconnect/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { PriorityBadge, StatusPill } from "@/components/Badges";
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
import { startOfTodayInManila, timeAgo, timeSince } from "@/lib/format";
import { priorityBand } from "@/lib/labels";

export const metadata: Metadata = { title: "Overview" };

const MOST_URGENT = 5;
const MULTI_REPORT_INCIDENTS = 5;

function reporterLabel(report: ReportSummary) {
  return !report.reporter || report.reporter.isGuest ? "Guest reporter" : (report.reporter.name ?? "Resident");
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
  const [active, pendingIds, today] = await Promise.all([
    listReports(["received", "in_progress"]),
    countPendingVerifications(),
    countReportsSince(startOfTodayInManila()),
  ]);

  // "Urgent" = Critical or High priority that nobody has started on yet.
  const urgentWaiting = active.filter(
    (r) => r.status === "received" && ["critical", "high"].includes(priorityBand(r.priority)),
  );
  const oldestUrgent = urgentWaiting.reduce<ReportSummary | null>(
    (oldest, r) => (!oldest || r.receivedAt < oldest.receivedAt ? r : oldest),
    null,
  );
  const inProgress = active.filter((r) => r.status === "in_progress").length;
  const mostUrgent = active.slice(0, MOST_URGENT); // already sorted by priority
  const incidents = multiReportIncidents(active);
  const byType = REPORT_CATEGORIES.map((category) => ({
    label: CATEGORY_LABELS[category],
    value: active.filter((r) => r.category === category).length,
  }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader title="Overview" description="Barangay Banaba right now. This page updates by itself.">
        <LiveRefresh />
      </PageHeader>

      <div className="space-y-6 px-8 py-6">
        <section aria-label="Work waiting" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Urgent, not yet handled"
            value={urgentWaiting.length}
            detail={
              oldestUrgent
                ? `Oldest has waited ${timeSince(oldestUrgent.receivedAt)}`
                : "Critical or High reports still marked Received"
            }
            href="/reports?status=active"
            action="Open the queue"
            accent={urgentWaiting.length > 0 ? "urgent" : "none"}
          />
          <StatTile
            label="Being handled"
            value={inProgress}
            detail="Reports marked In progress"
            href="/reports?status=active"
            action="See active reports"
          />
          <StatTile
            label="Barangay IDs to review"
            value={pendingIds}
            detail="Residents waiting for verification"
            href="/residents"
            action="Review IDs"
            accent={pendingIds > 0 ? "waiting" : "none"}
          />
          <StatTile
            label="Reports today"
            value={today.received}
            detail={`${today.resolved} resolved · since midnight`}
            href="/reports?status=all"
            action="See all reports"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="most-urgent">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="most-urgent" className="text-base font-extrabold">
                Most urgent now
              </h2>
              <Link href="/reports?status=active" className="text-sm font-bold text-brand hover:underline">
                See all active reports →
              </Link>
            </div>
            {mostUrgent.length === 0 ? (
              <p className="py-10 text-center text-[15px] text-muted">
                No active reports right now. New reports appear here automatically.
              </p>
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
                        <span className="block text-base font-bold">{CATEGORY_LABELS[report.category]}</span>
                        <span className="block truncate text-sm text-muted">
                          {reporterLabel(report)} · {timeAgo(report.createdAt)}
                          {report.clusterCount > 1 && ` · ${report.clusterCount} reports nearby`}
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
            <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="several">
              <h2 id="several" className="text-base font-extrabold">
                Reported by several people
              </h2>
              <p className="mb-3 text-sm text-muted">Same kind of incident within 150 m and 2 hours.</p>
              {incidents.length === 0 ? (
                <p className="py-4 text-[15px] text-muted">No active incident has more than one report.</p>
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
                            {CATEGORY_LABELS[report.category]} · {report.clusterCount} reports
                          </span>
                          <span className="block text-sm text-muted">Most urgent one reported {timeAgo(report.createdAt)}</span>
                        </span>
                        <StatusPill status={report.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="by-type">
              <h2 id="by-type" className="text-base font-extrabold">
                Active reports by type
              </h2>
              <p className="mb-4 text-sm text-muted">Received and In progress.</p>
              {byType.length === 0 ? (
                <p className="py-4 text-[15px] text-muted">No active reports.</p>
              ) : (
                <BarList label="Active reports by type" rows={byType} />
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
