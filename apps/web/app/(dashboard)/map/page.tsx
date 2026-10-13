import { CATEGORY_LABELS } from "@banabaconnect/shared";
import type { Metadata } from "next";
import { FilterTabs } from "@/components/FilterTabs";
import { LiveMap } from "@/components/map/LiveMap";
import type { MapPoint } from "@/components/map/MapLoader";
import { PageHeader } from "@/components/PageHeader";
import { listReports } from "@/lib/data";
import { formatDistance, scoreOutOf100, timeAgo } from "@/lib/format";
import {
  PRIORITY_BAND_COLORS,
  PRIORITY_BAND_LABELS,
  STAFF_STATUS_LABELS,
  STATUS_FILTERS,
  otherReportsLabel,
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
      rank: LEGEND.length - 1 - LEGEND.indexOf(band),
      title: `${CATEGORY_LABELS[report.category]} · ${scoreOutOf100(report.priority)} ${PRIORITY_BAND_LABELS[band]}`,
      lines: [
        `${STAFF_STATUS_LABELS[report.status]} · ${timeAgo(report.createdAt)}`,
        report.clusterCount > 1 ? otherReportsLabel(report.clusterCount) : "",
        report.outsideBanabaM !== null
          ? `Outside Banaba · ${formatDistance(report.outsideBanabaM)} away`
          : "",
      ].filter(Boolean),
      outside: report.outsideBanabaM !== null,
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
              <span
                className="h-4 w-4 rounded-full border-2 border-white ring-1 ring-ink/50"
                style={{ backgroundColor: PRIORITY_BAND_COLORS[band] }}
              />
              {PRIORITY_BAND_LABELS[band]}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-5 rounded-sm border-[3px] border-brand bg-brand/10" />
            Barangay Banaba boundary
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full border-[3px] bg-surface text-[11px] leading-none"
              style={{ borderColor: PRIORITY_BAND_COLORS.critical }}
            >
              3
            </span>
            Reports close together (ring shows the most urgent). Click to zoom in.
          </span>
          <span className="flex items-center gap-1.5">
            <span className="relative h-4 w-6">
              <span className="absolute left-0 top-1/2 h-0.5 w-6 -translate-y-1/2 bg-ink/60" />
              <span className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-ink ring-1 ring-white" />
            </span>
            Reports from the same spot, spread out with a line to where they were sent from
          </span>
        </div>
        <LiveMap points={points} />
      </div>
    </>
  );
}
