import { CATEGORY_LABELS } from "@banabaconnect/shared";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { QueueTable, type QueueRow } from "@/components/QueueTable";
import { ReportStatusCards } from "@/components/ReportStatusCards";
import { QUEUE_LIMIT, countReportsByStatus, countWithStatus, listReports } from "@/lib/data";
import { formatDateTime, startOfTodayInManila, timeAgo, waitedForSignal } from "@/lib/format";
import { STATUS_FILTERS, parseStatusFilter, type StatusFilter } from "@/lib/labels";
import { parseSort, sortQuery, sortReports } from "@/lib/reportSort";

export const metadata: Metadata = { title: "Reports" };

const EMPTY_MESSAGES: Record<StatusFilter, string> = {
  active: "No active reports right now",
  resolved: "No resolved reports yet",
  closed: "No reports marked invalid",
  all: "No reports yet",
};

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const params = await searchParams;
  const filter = parseStatusFilter(params.status);
  const sort = parseSort(params.sort, params.dir);
  const [listed, counts] = await Promise.all([
    listReports(STATUS_FILTERS[filter].statuses),
    countReportsByStatus(startOfTodayInManila()),
  ]);
  const reports = sortReports(listed, sort);

  const rows: QueueRow[] = reports.map((report) => ({
    id: report.id,
    categoryLabel: CATEGORY_LABELS[report.category],
    description: report.description,
    hasPhoto: report.hasPhoto,
    priority: report.priority,
    status: report.status,
    reporterName: report.reporter?.name ?? null,
    reporterIsGuest: report.reporter?.isGuest ?? true,
    reporterVerification: report.reporter?.verification ?? null,
    reporterArea: report.reporter?.area ?? null,
    clusterCount: report.clusterCount,
    clusterPeople: report.clusterPeople,
    outsideBanabaM: report.outsideBanabaM,
    reportedAgo: timeAgo(report.createdAt),
    reportedAt: formatDateTime(report.createdAt),
    waited: waitedForSignal(report.createdAt, report.receivedAt),
  }));

  return (
    <>
      <PageHeader title="Reports" description="Incident reports from residents of Barangay Banaba.">
        <ReportStatusCards counts={counts} current={filter} keepQuery={sortQuery(sort)} />
      </PageHeader>
      <div className="px-8 py-6">
        <QueueTable
          rows={rows}
          // The list stops at QUEUE_LIMIT while the cards count everything, so it says when it's cut short.
          total={
            listed.length >= QUEUE_LIMIT ? countWithStatus(counts, STATUS_FILTERS[filter].statuses) : undefined
          }
          emptyMessage={EMPTY_MESSAGES[filter]}
          filter={filter}
          sort={sort}
        />
      </div>
    </>
  );
}
