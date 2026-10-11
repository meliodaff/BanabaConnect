import { CATEGORY_LABELS } from "@banabaconnect/shared";
import type { Metadata } from "next";
import { FilterTabs } from "@/components/FilterTabs";
import { LiveMap } from "@/components/map/LiveMap";
import type { MapPoint } from "@/components/map/MapLoader";
import { PageHeader } from "@/components/PageHeader";
import { listReports } from "@/lib/data";
import { scoreOutOf100, timeAgo } from "@/lib/format";
import {
  PRIORITY_BAND_COLORS,
  PRIORITY_BAND_LABELS,
  STAFF_STATUS_LABELS,
  STATUS_FILTERS,
  parseStatusFilter,
  priorityBand,
  type PriorityBand,
  type StatusFilter,
} from "@/lib/labels";

export const metadata: Metadata = { title: "Map" };

const LEGEND: PriorityBand[] = ["critical", "high", "medium", "low"];

export default async function MapPage({ searchParams }: PageProps<"/map">) {
  const filter = parseStatusFilter((await searchParams).status);
  const reports = await listReports(STATUS_FILTERS[filter].statuses);

  const points: MapPoint[] = reports.map((report) => {
    const band = priorityBand(report.priority);
    return {
      id: report.id,
      latitude: report.latitude,
      longitude: report.longitude,
      color: PRIORITY_BAND_COLORS[band],
      title: `${CATEGORY_LABELS[report.category]} · ${scoreOutOf100(report.priority)} ${PRIORITY_BAND_LABELS[band]}`,
      lines: [
        `${STAFF_STATUS_LABELS[report.status]} · ${timeAgo(report.createdAt)}`,
        report.clusterCount > 1 ? `${report.clusterCount} reports nearby` : "",
      ].filter(Boolean),
      href: `/reports/${report.id}?from=map`,
    };
  });

  return (
    <>
      <PageHeader title="Map" description={`${points.length} reports shown. Click a pin for details.`}>
        <FilterTabs
          label="Report status"
          basePath="/map"
          param="status"
          current={filter}
          tabs={(Object.keys(STATUS_FILTERS) as StatusFilter[]).map((key) => ({
            key,
            label: STATUS_FILTERS[key].label,
          }))}
        />
      </PageHeader>
      <div className="px-8 py-6">
        <div className="mb-3 flex flex-wrap gap-4 text-sm font-semibold">
          {LEGEND.map((band) => (
            <span key={band} className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: PRIORITY_BAND_COLORS[band] }} />
              {PRIORITY_BAND_LABELS[band]}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-5 rounded-sm border-[3px] border-brand bg-brand/10" />
            Barangay Banaba boundary
          </span>
        </div>
        <LiveMap points={points} />
      </div>
    </>
  );
}
