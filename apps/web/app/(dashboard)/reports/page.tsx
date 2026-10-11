import { CATEGORY_LABELS } from "@banabaconnect/shared";
import type { Metadata } from "next";
import { FilterTabs } from "@/components/FilterTabs";
import { PageHeader } from "@/components/PageHeader";
import { QueueTable, type QueueRow } from "@/components/QueueTable";
import { listReports } from "@/lib/data";
import { formatDateTime, timeAgo, waitedForSignal } from "@/lib/format";
import { STATUS_FILTERS, parseStatusFilter, type StatusFilter } from "@/lib/labels";

export const metadata: Metadata = { title: "Reports" };

const EMPTY_MESSAGES: Record<StatusFilter, string> = {
  active: "No active reports right now",
  resolved: "No resolved reports yet",
  closed: "No reports marked invalid",
  all: "No reports yet",
};

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const filter = parseStatusFilter((await searchParams).status);
  const reports = await listReports(STATUS_FILTERS[filter].statuses);

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
    reportedAgo: timeAgo(report.createdAt),
    reportedAt: formatDateTime(report.createdAt),
    waited: waitedForSignal(report.createdAt, report.receivedAt),
  }));

  return (
    <>
      <PageHeader title="Reports" description="Incident reports from residents of Barangay Banaba.">
        <FilterTabs
          label="Report status"
          basePath="/reports"
          param="status"
          current={filter}
          tabs={(Object.keys(STATUS_FILTERS) as StatusFilter[]).map((key) => ({
            key,
            label: STATUS_FILTERS[key].label,
          }))}
        />
      </PageHeader>
      <div className="px-8 py-6">
        <QueueTable rows={rows} emptyMessage={EMPTY_MESSAGES[filter]} backTo={filter} />
      </div>
    </>
  );
}
