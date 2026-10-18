import type { Metadata } from "next";
import { MonthlyReportLink } from "@/components/MonthlyReportLink";
import { PageHeader } from "@/components/PageHeader";
import { QueueTable, type QueueRow } from "@/components/QueueTable";
import { ReportStatusCards } from "@/components/ReportStatusCards";
import { QUEUE_LIMIT, countReportsByStatus, countWithStatus, listReports } from "@/lib/data";
import { formatDateTime, startOfTodayInManila } from "@/lib/format";
import { getDictionary } from "@/lib/i18n-server";
import {
  ONLY_FILTERS,
  STATUS_FILTERS,
  dateQuery,
  parseDateFilter,
  parseOnlyFilter,
  parseStatusFilter,
} from "@/lib/labels";
import { PAGE_SIZE, pageCount, parsePage } from "@/lib/pagination";
import { parseSort, sortQuery, sortReports } from "@/lib/reportSort";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).reports.title };
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const params = await searchParams;
  const only = parseOnlyFilter(params.only);
  // The Overview's narrower views are part of Active, so the Active card stays selected.
  const filter = only ? "active" : parseStatusFilter(params.status);
  const sort = parseSort(params.sort, params.dir);
  const date = parseDateFilter(params.date);
  const statuses = only ? ONLY_FILTERS[only].statuses : STATUS_FILTERS[filter].statuses;
  // Same rule as Overview's "Reports today": reached the barangay since midnight, Philippine time.
  const today = startOfTodayInManila();
  const receivedSince = date === "today" ? today : undefined;
  const [listed, counts, t] = await Promise.all([
    listReports(statuses, { receivedSince, minPriority: only ? ONLY_FILTERS[only].minPriority : undefined }),
    countReportsByStatus(today, receivedSince),
    getDictionary(),
  ]);
  const reports = sortReports(listed, sort, t.category);
  // Paged after sorting, so every column sort works across pages. A page past the end (the list
  // got shorter, or an old link) shows the last page.
  const page = Math.min(parsePage(params.page), pageCount(reports.length));
  const onPage = reports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rows: QueueRow[] = onPage.map((report) => ({
    id: report.id,
    categoryLabel: t.category[report.category],
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
    reportedAgo: t.time.ago(report.createdAt),
    reportedAt: formatDateTime(report.createdAt),
    waited: t.time.waited(report.createdAt, report.receivedAt),
  }));

  return (
    <>
      <PageHeader title={t.reports.title} description={t.reports.description}>
        <MonthlyReportLink />
        <ReportStatusCards counts={counts} current={filter} keepQuery={`${sortQuery(sort)}${dateQuery(date)}`} />
      </PageHeader>
      <div className="px-8 py-6">
        <QueueTable
          rows={rows}
          count={reports.length}
          page={page}
          // The list stops at QUEUE_LIMIT while the cards count everything, so it says when it's cut short.
          total={
            listed.length < QUEUE_LIMIT
              ? undefined
              : only === "urgent"
                ? counts.urgentWaiting
                : countWithStatus(counts, statuses)
          }
          emptyMessage={
            only ? t.reports.emptyOnly[only] : date === "today" ? t.reports.emptyToday : t.reports.empty[filter]
          }
          filter={filter}
          filters={{ date, only }}
          sort={sort}
        />
      </div>
    </>
  );
}
