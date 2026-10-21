import { MCPS_WEIGHTS } from "@banabaconnect/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  GuestBadge,
  OutsideBanabaTag,
  PriorityBadge,
  StatusPill,
  VerificationBadge,
} from "@/components/Badges";
import { CopyButton } from "@/components/CopyButton";
import { IncidentReportSheet } from "@/components/IncidentReportSheet";
import { MapLoader } from "@/components/map/MapLoader";
import { PrintButton } from "@/components/PrintButton";
import { StatusUpdateForm } from "@/components/StatusUpdateForm";
import { getReport, type ReportDetail } from "@/lib/data";
import { formatDateTime, scoreOutOf100 } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n-server";
import {
  PRIORITY_BAND_COLORS,
  filtersQuery,
  parseListFilters,
  parseStatusFilter,
  priorityBand,
  reportNumber,
  type ListFilters,
} from "@/lib/labels";
import { pageQuery, parsePage } from "@/lib/pagination";
import { parseSort, sortQuery, type ReportSort } from "@/lib/reportSort";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).report.title };
}

/**
 * Back to where the staff member came from: Overview, the map, or the queue with its filters, sort
 * and page. Links into a report carry them as
 * ?from=active&sort=reported&dir=asc&page=2&only=urgent&type=fire&level=high&date=today.
 */
function backLink(
  from: string | string[] | undefined,
  sort: ReportSort,
  page: number,
  filters: ListFilters,
  t: Dictionary,
) {
  if (from === "overview") {
    return { href: "/", label: t.report.backToOverview, from: "overview" };
  }
  if (from === "map") {
    return { href: "/map", label: t.report.backToMap, from: "map" };
  }
  const filter = parseStatusFilter(from);
  const sorted = `${filter}${sortQuery(sort)}${pageQuery(page)}${filtersQuery(filters)}`;
  return { href: `/reports?status=${sorted}`, label: t.report.backToReports, from: sorted };
}

export default async function ReportPage({ params, searchParams }: PageProps<"/reports/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const t = await getDictionary();
  const back = backLink(
    query.from,
    parseSort(query.sort, query.dir),
    parsePage(query.page),
    parseListFilters(query),
    t,
  );
  const report = /^[0-9a-f-]{36}$/i.test(id) ? await getReport(id) : null;
  if (!report) {
    notFound();
  }
  const waited = t.time.waited(report.createdAt, report.receivedAt);
  const category = t.category[report.category];

  return (
    <>
      <div className="px-8 py-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={back.href} className="inline-block py-2 text-[15px] font-bold text-brand hover:underline">
            {back.label}
          </Link>
          {/* The printout is in English, as an official record. */}
          <PrintButton documentTitle={`Incident report ${reportNumber(report.id)}`} />
        </div>

        <div data-tour="report-priority" className="mt-3 flex flex-wrap items-center gap-4">
          <PriorityBadge score={report.priority} size="lg" />
          <div>
            <h1 className="text-2xl font-bold">{category}</h1>
            <p className="text-[15px] text-muted">
              {t.report.reported(t.time.ago(report.createdAt), formatDateTime(report.createdAt))}
            </p>
          </div>
          <StatusPill status={report.status} />
          {report.outsideBanabaM !== null && <OutsideBanabaTag meters={report.outsideBanabaM} />}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            {report.category === "sos" && <SosNotice report={report} t={t} />}
            <Card title={t.report.sawTitle}>
              {report.photoUrl ? (
                // A signed, short-lived Supabase link, so next/image optimization isn't used.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={report.photoUrl}
                  alt={t.report.photoAlt(category)}
                  className="max-h-[480px] w-full rounded-lg bg-page object-contain"
                />
              ) : (
                <p className="rounded-lg bg-page px-4 py-6 text-center text-[15px] text-muted">
                  {report.hasPhoto ? t.report.photoFailed : t.report.noPhoto}
                </p>
              )}
              <p className="mt-4 whitespace-pre-wrap text-base">
                {report.description || <span className="text-muted">{t.report.noDescription}</span>}
              </p>
            </Card>

            <Card title={t.report.locationTitle}>
              {report.outsideBanabaM !== null && (
                <p className="mb-4 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-[15px]">
                  <span className="font-bold">{t.report.outside(t.time.distance(report.outsideBanabaM))}</span>{" "}
                  {t.report.outsideAdvice}
                </p>
              )}
              <MapLoader
                height="320px"
                points={[
                  {
                    id: report.id,
                    latitude: report.latitude,
                    longitude: report.longitude,
                    color: PRIORITY_BAND_COLORS[priorityBand(report.priority)],
                    title: category,
                    lines: [`${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`],
                  },
                ]}
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted">
                  {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                  {report.accuracy !== null && ` · ${t.report.accurateTo(Math.round(report.accuracy))}`}
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-brand hover:underline"
                >
                  {t.report.openInMaps}
                </a>
              </div>
            </Card>

            <LinkedReports report={report} from={back.from} t={t} />
          </div>

          <div className="space-y-6">
            <Card title={t.report.updateStatusTitle} tour="report-status-form">
              <StatusUpdateForm reportId={report.id} current={report.status} />
            </Card>

            <ScoreBreakdown report={report} t={t} />

            <Card title={t.report.reporterTitle}>
              {!report.reporter || report.reporter.isGuest ? (
                <div className="space-y-1.5">
                  <GuestBadge />
                  <p className="text-[15px] text-muted">{t.report.guestExplained}</p>
                </div>
              ) : (
                <dl className="space-y-2 text-[15px]">
                  <Row label={t.report.name} value={report.reporter.name ?? t.common.noName} />
                  <Row
                    label={t.report.mobile}
                    value={
                      report.reporter.phone ? (
                        <span className="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                          <a href={`tel:${report.reporter.phone}`} className="font-bold text-brand hover:underline">
                            {report.reporter.phone}
                          </a>
                          <CopyButton text={report.reporter.phone} />
                        </span>
                      ) : (
                        t.common.notGiven
                      )
                    }
                  />
                  <Row label={t.report.area} value={report.reporter.area ?? t.common.notGiven} />
                  <Row label={t.report.address} value={report.reporter.address ?? t.common.notGiven} />
                  <Row label={t.report.idStatus} value={<VerificationBadge status={report.reporter.verification} />} />
                </dl>
              )}
            </Card>

            <Card title={t.report.timelineTitle}>
              <ol className="space-y-3 text-[15px]">
                <TimelineItem title={t.report.happened} time={formatDateTime(report.incidentAt)} />
                <TimelineItem title={t.report.reportedOnPhone} time={formatDateTime(report.createdAt)} />
                <TimelineItem
                  title={t.report.reachedBarangay}
                  time={formatDateTime(report.receivedAt)}
                  detail={waited ? t.time.waitedForSignal(waited) : undefined}
                  detailTone="warning"
                />
                {report.history
                  .filter((change) => change.from !== null)
                  .map((change) => (
                    <TimelineItem
                      key={change.id}
                      title={t.report.changedBy(
                        t.status[change.to],
                        change.byStaff ? (change.changedBy ?? t.common.barangayStaff) : t.common.reporter,
                      )}
                      time={formatDateTime(change.changedAt)}
                      detail={change.note ? `“${change.note}”` : undefined}
                    />
                  ))}
              </ol>
            </Card>
          </div>
        </div>
      </div>

      {/* What prints instead of the page above: the report as a paper document. */}
      <div className="hidden print:block">
        <IncidentReportSheet report={report} asOf={new Date().toISOString()} />
      </div>
    </>
  );
}

/**
 * Volume counts different people, not reports, and leaves out reports marked Invalid
 * (supabase/migrations/20261016000000_volume_counts_people.sql). Say so when the two differ.
 */
function volumeReason(people: number, reports: number, t: Dictionary): string {
  if (people <= 1 && reports <= 1) return t.report.onlyReport;
  if (people === reports) return t.report.peopleReported(people);
  return `${t.report.peopleReported(people)} · ${t.report.repeats(reports)}`;
}

/**
 * What staff need first on an SOS: there are no details, so act on the location, call the
 * resident, and know whether the phone's owner confirmed it (submit_report's phone_lock_confirmed).
 */
function SosNotice({ report, t }: { report: ReportDetail; t: Dictionary }) {
  const phone = report.reporter?.phone;
  return (
    <section className="rounded-lg border border-urgent/30 bg-urgent-soft px-5 py-4" aria-label={t.category.sos}>
      <h2 className="text-base font-bold text-urgent">{t.report.sosTitle}</h2>
      <p className="mt-1 text-[15px]">{t.report.sosAdvice}</p>
      {report.phoneLockConfirmed !== null && (
        <p className="mt-2 text-[15px] font-semibold">
          {report.phoneLockConfirmed ? t.report.ownerConfirmed : t.report.ownerNotConfirmed}
        </p>
      )}
      {phone && (
        <a
          href={`tel:${phone}`}
          className="mt-3 inline-flex min-h-11 items-center rounded-md bg-urgent px-4 py-2 text-[15px] font-bold text-white hover:opacity-90"
        >
          {t.report.sosCall(phone)}
        </a>
      )}
    </section>
  );
}

/** How the priority adds up, in points: what each part earned, out of the most it can give. */
function ScoreBreakdown({ report, t }: { report: ReportDetail; t: Dictionary }) {
  // An SOS doesn't use the formula (see 20261019000001_sos_reports.sql), so don't show one.
  if (report.category === "sos") {
    return (
      <Card title={t.report.whyTitle}>
        <p className="text-[15px]">{t.report.sosPriority}</p>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-base font-bold">
          <span>{t.report.priorityTotal}</span>
          <span className="tabular-nums">{scoreOutOf100(report.priority)} / 100</span>
        </div>
      </Card>
    );
  }
  const reporter = report.reporter;
  const credibilityReason = !reporter || reporter.isGuest ? t.common.guestReporter : t.verification[reporter.verification];
  const parts = [
    {
      label: t.report.seriousness,
      reason: t.category[report.category],
      value: report.severity,
      weight: MCPS_WEIGHTS.severity,
    },
    {
      label: t.report.nearbyReports,
      reason: volumeReason(report.clusterPeople, report.clusterCount, t),
      value: report.volume,
      weight: MCPS_WEIGHTS.volume,
    },
    {
      label: t.report.reporterPart,
      reason: credibilityReason,
      value: report.credibility,
      weight: MCPS_WEIGHTS.credibility,
    },
  ];

  return (
    <Card title={t.report.whyTitle}>
      <ul className="space-y-3">
        {parts.map((part) => {
          const contribution = (part.value ?? 0) * part.weight;
          return (
            <li key={part.label}>
              <div className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className="font-bold">
                  {part.label} <span className="font-normal text-muted">· {part.reason}</span>
                </span>
                <span className="tabular-nums font-bold">+{Math.round(contribution * 100)}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-page">
                <div
                  className="h-2 rounded-full bg-brand"
                  style={{ width: `${Math.round((part.value ?? 0) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[13px] text-muted">{t.report.upTo(Math.round(part.weight * 100))}</p>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-base font-bold">
        <span>{t.report.priorityTotal}</span>
        <span className="tabular-nums">{scoreOutOf100(report.priority)} / 100</span>
      </div>
    </Card>
  );
}

function LinkedReports({ report, from, t }: { report: ReportDetail; from: string; t: Dictionary }) {
  if (report.linked.length === 0) {
    return null;
  }
  return (
    <Card title={t.report.linkedTitle(report.linked.length)}>
      <p className="mb-3 text-sm text-muted">{t.report.linkedExplained}</p>
      <ul className="divide-y divide-line">
        {report.linked.map((linked) => (
          <li key={linked.id}>
            <Link
              href={`/reports/${linked.id}?from=${from}`}
              className="flex items-center justify-between gap-3 py-3 hover:text-brand"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-bold">
                  {linked.reporter?.isGuest ? t.common.guestReporter : (linked.reporter?.name ?? t.common.resident)}
                </span>
                <span className="block truncate text-sm text-muted">
                  {t.time.ago(linked.createdAt)} · {linked.description || t.common.noDescription}
                </span>
              </span>
              <StatusPill status={linked.status} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** `tour` names the card for the dashboard tutorial. */
function Card({ title, tour, children }: { title: string; tour?: string; children: React.ReactNode }) {
  return (
    <section data-tour={tour} className="rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-4 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

function TimelineItem({
  title,
  time,
  detail,
  detailTone = "note",
}: {
  title: string;
  time: string;
  detail?: string;
  /** "warning" only for delays; staff notes are plain text. */
  detailTone?: "note" | "warning";
}) {
  return (
    <li className="border-l-2 border-brand pl-3">
      <p className="font-bold">{title}</p>
      <p className="text-sm text-muted">{time}</p>
      {detail && (
        <p className={`text-sm ${detailTone === "warning" ? "font-semibold text-warning" : "text-ink"}`}>{detail}</p>
      )}
    </li>
  );
}
