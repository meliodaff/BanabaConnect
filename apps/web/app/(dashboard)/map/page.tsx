import type { Metadata } from "next";
import { FilterTabs } from "@/components/FilterTabs";
import { LiveMap } from "@/components/map/LiveMap";
import type { MapPoint } from "@/components/map/MapLoader";
import { PageHeader } from "@/components/PageHeader";
import { listReports } from "@/lib/data";
import { scoreOutOf100 } from "@/lib/format";
import { getDictionary } from "@/lib/i18n-server";
import {
  PRIORITY_BAND_COLORS,
  STATUS_FILTERS,
  parseStatusFilter,
  priorityBand,
  type PriorityBand,
  type StatusFilter,
} from "@/lib/labels";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).map.title };
}

const LEGEND: PriorityBand[] = ["critical", "high", "medium", "low"];

export default async function MapPage({ searchParams }: PageProps<"/map">) {
  const filter = parseStatusFilter((await searchParams).status);
  const [reports, t] = await Promise.all([listReports(STATUS_FILTERS[filter].statuses), getDictionary()]);

  const points: MapPoint[] = reports.map((report) => {
    const band = priorityBand(report.priority);
    return {
      id: report.id,
      latitude: report.latitude,
      longitude: report.longitude,
      color: PRIORITY_BAND_COLORS[band],
      rank: LEGEND.length - 1 - LEGEND.indexOf(band),
      title: `${t.category[report.category]} · ${scoreOutOf100(report.priority)} ${t.priority[band]}`,
      lines: [
        `${t.status[report.status]} · ${t.time.ago(report.createdAt)}`,
        report.clusterCount > 1 ? t.nearby.others(report.clusterCount) : "",
        report.outsideBanabaM !== null ? t.map.outsideLine(t.time.distance(report.outsideBanabaM)) : "",
      ].filter(Boolean),
      outside: report.outsideBanabaM !== null,
      href: `/reports/${report.id}?from=map`,
    };
  });

  return (
    <>
      <PageHeader title={t.map.title} description={t.map.description(points.length)}>
        <FilterTabs
          label={t.reports.statusLabel}
          basePath="/map"
          param="status"
          current={filter}
          tabs={(Object.keys(STATUS_FILTERS) as StatusFilter[]).map((key) => ({
            key,
            label: t.filters[key],
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
              {t.priority[band]}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-5 rounded-sm border-[3px] border-brand bg-brand/10" />
            {t.map.boundary}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full border-[3px] bg-surface text-[11px] leading-none"
              style={{ borderColor: PRIORITY_BAND_COLORS.critical }}
            >
              3
            </span>
            {t.map.closeTogether}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="relative h-4 w-6">
              <span className="absolute left-0 top-1/2 h-0.5 w-6 -translate-y-1/2 bg-ink/60" />
              <span className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-ink ring-1 ring-white" />
            </span>
            {t.map.sameSpot}
          </span>
        </div>
        <LiveMap points={points} />
      </div>
    </>
  );
}
