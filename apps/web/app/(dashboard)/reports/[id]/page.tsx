import { CATEGORY_LABELS, MCPS_WEIGHTS, VERIFICATION_LABELS } from "@banabaconnect/shared";
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
import { MapLoader } from "@/components/map/MapLoader";
import { StatusUpdateForm } from "@/components/StatusUpdateForm";
import { getReport, type ReportDetail } from "@/lib/data";
import { formatDateTime, formatDistance, scoreOutOf100, timeAgo, waitedForSignal } from "@/lib/format";
import {
  PRIORITY_BAND_COLORS,
  STAFF_STATUS_LABELS,
  parseStatusFilter,
  priorityBand,
} from "@/lib/labels";
import { pageQuery, parsePage } from "@/lib/pagination";
import { parseSort, sortQuery, type ReportSort } from "@/lib/reportSort";

export const metadata: Metadata = { title: "Report" };

/**
 * Back to where the staff member came from: Overview, the map, or the queue with its filter, sort
 * and page. Links into a report carry them as ?from=active&sort=reported&dir=asc&page=2.
 */
function backLink(from: string | string[] | undefined, sort: ReportSort, page: number) {
  if (from === "overview") {
    return { href: "/", label: "← Back to overview", from: "overview" };
  }
  if (from === "map") {
    return { href: "/map", label: "← Back to map", from: "map" };
  }
  const filter = parseStatusFilter(from);
  const sorted = `${filter}${sortQuery(sort)}${pageQuery(page)}`;
  return { href: `/reports?status=${sorted}`, label: "← Back to reports", from: sorted };
}

export default async function ReportPage({ params, searchParams }: PageProps<"/reports/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const back = backLink(query.from, parseSort(query.sort, query.dir), parsePage(query.page));
  const report = /^[0-9a-f-]{36}$/i.test(id) ? await getReport(id) : null;
  if (!report) {
    notFound();
  }
  const waited = waitedForSignal(report.createdAt, report.receivedAt);

  return (
    <div className="px-8 py-6">
      <Link href={back.href} className="inline-block py-2 text-[15px] font-bold text-brand hover:underline">
        {back.label}
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <PriorityBadge score={report.priority} size="lg" />
        <div>
          <h1 className="text-2xl font-bold">{CATEGORY_LABELS[report.category]}</h1>
          <p className="text-[15px] text-muted">
            Reported {timeAgo(report.createdAt)} · {formatDateTime(report.createdAt)}
          </p>
        </div>
        <StatusPill status={report.status} />
        {report.outsideBanabaM !== null && <OutsideBanabaTag meters={report.outsideBanabaM} />}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card title="What the resident saw">
            {report.photoUrl ? (
              // A signed, short-lived Supabase link, so next/image optimization isn't used.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={report.photoUrl}
                alt={`Photo of the ${CATEGORY_LABELS[report.category].toLowerCase()} report`}
                className="max-h-[480px] w-full rounded-lg bg-page object-contain"
              />
            ) : (
              <p className="rounded-lg bg-page px-4 py-6 text-center text-[15px] text-muted">
                {report.hasPhoto ? "The photo couldn't be loaded." : "No photo was sent."}
              </p>
            )}
            <p className="mt-4 whitespace-pre-wrap text-base">
              {report.description || <span className="text-muted">No description.</span>}
            </p>
          </Card>

          <Card title="Location">
            {report.outsideBanabaM !== null && (
              <p className="mb-4 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-[15px]">
                <span className="font-bold">
                  Sent from {formatDistance(report.outsideBanabaM)} outside Barangay Banaba.
                </span>{" "}
                It may be for a neighboring barangay. Pass it on to them or the San Mateo MDRRMO, or
                mark it Invalid if it isn&apos;t a real emergency.
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
                  title: CATEGORY_LABELS[report.category],
                  lines: [`${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`],
                },
              ]}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted">
                {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                {report.accuracy !== null && ` · accurate to about ${Math.round(report.accuracy)} m`}
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-brand hover:underline"
              >
                Open in Google Maps
              </a>
            </div>
          </Card>

          <LinkedReports report={report} from={back.from} />
        </div>

        <div className="space-y-6">
          <Card title="Update status">
            <StatusUpdateForm reportId={report.id} current={report.status} />
          </Card>

          <ScoreBreakdown report={report} />

          <Card title="Reporter">
            {!report.reporter || report.reporter.isGuest ? (
              <div className="space-y-1.5">
                <GuestBadge />
                <p className="text-[15px] text-muted">
                  Reported without an account, so there&apos;s no name or number.
                </p>
              </div>
            ) : (
              <dl className="space-y-2 text-[15px]">
                <Row label="Name" value={report.reporter.name ?? "No name"} />
                <Row
                  label="Mobile"
                  value={
                    report.reporter.phone ? (
                      <a href={`tel:${report.reporter.phone}`} className="font-bold text-brand hover:underline">
                        {report.reporter.phone}
                      </a>
                    ) : (
                      "Not given"
                    )
                  }
                />
                <Row label="Sitio / purok" value={report.reporter.area ?? "Not given"} />
                <Row label="Address" value={report.reporter.address ?? "Not given"} />
                <Row label="Status" value={<VerificationBadge status={report.reporter.verification} />} />
              </dl>
            )}
          </Card>

          <Card title="Timeline">
            <ol className="space-y-3 text-[15px]">
              <TimelineItem title="Happened" time={formatDateTime(report.incidentAt)} />
              <TimelineItem title="Reported on the phone" time={formatDateTime(report.createdAt)} />
              <TimelineItem
                title="Reached the barangay"
                time={formatDateTime(report.receivedAt)}
                detail={waited ? `Waited ${waited} for signal` : undefined}
                detailTone="warning"
              />
              {report.history
                .filter((change) => change.from !== null)
                .map((change) => (
                  <TimelineItem
                    key={change.id}
                    title={`${STAFF_STATUS_LABELS[change.to]} · by ${change.changedBy ?? "staff"}`}
                    time={formatDateTime(change.changedAt)}
                    detail={change.note ? `“${change.note}”` : undefined}
                  />
                ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Volume counts different people, not reports, and leaves out reports marked Invalid
 * (supabase/migrations/20261016000000_volume_counts_people.sql). Say so when the two differ.
 */
function volumeReason(people: number, reports: number): string {
  const who = people === 1 ? "1 person has" : `${people} people have`;
  if (people <= 1 && reports <= 1) return "Only report of this incident so far";
  if (people === reports) return `${who} reported this incident`;
  return `${who} reported this incident · ${reports} reports, but repeats from one person and Invalid reports don't add`;
}

function ScoreBreakdown({ report }: { report: ReportDetail }) {
  const reporter = report.reporter;
  const credibilityReason =
    !reporter || reporter.isGuest ? "Guest reporter" : VERIFICATION_LABELS[reporter.verification];
  const parts = [
    {
      label: "Seriousness",
      reason: CATEGORY_LABELS[report.category],
      value: report.severity,
      weight: MCPS_WEIGHTS.severity,
    },
    {
      label: "Nearby reports",
      reason: volumeReason(report.clusterPeople, report.clusterCount),
      value: report.volume,
      weight: MCPS_WEIGHTS.volume,
    },
    {
      label: "Reporter",
      reason: credibilityReason,
      value: report.credibility,
      weight: MCPS_WEIGHTS.credibility,
    },
  ];

  return (
    <Card title="Why this priority">
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
              <p className="mt-1 text-[13px] text-muted">
                {Math.round(part.weight * 100)}% of the score × {scoreOutOf100(part.value)}/100
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-base font-bold">
        <span>Priority</span>
        <span className="tabular-nums">{scoreOutOf100(report.priority)} / 100</span>
      </div>
    </Card>
  );
}

function LinkedReports({ report, from }: { report: ReportDetail; from: string }) {
  if (report.linked.length === 0) {
    return null;
  }
  return (
    <Card title={`Linked reports (${report.linked.length})`}>
      <p className="mb-3 text-sm text-muted">
        Same kind of incident reported within 150 m and 2 hours. They count as one incident.
      </p>
      <ul className="divide-y divide-line">
        {report.linked.map((linked) => (
          <li key={linked.id}>
            <Link
              href={`/reports/${linked.id}?from=${from}`}
              className="flex items-center justify-between gap-3 py-3 hover:text-brand"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-bold">
                  {linked.reporter?.isGuest ? "Guest reporter" : linked.reporter?.name ?? "Resident"}
                </span>
                <span className="block truncate text-sm text-muted">
                  {timeAgo(linked.createdAt)} · {linked.description || "No description"}
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
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
