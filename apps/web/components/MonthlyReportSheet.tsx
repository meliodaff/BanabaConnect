import { CATEGORY_LABELS } from "@banabaconnect/shared";
import {
  DocumentHeader,
  DocumentSection,
  Field,
  HeaderDetail,
  Note,
  SignatureFooter,
} from "@/components/PrintDocument";
import type { ReportWithResponse } from "@/lib/data";
import { formatDateTime, formatDateTimeWithYear, formatDuration, scoreOutOf100 } from "@/lib/format";
import { PRIORITY_BAND_LABELS, STAFF_STATUS_LABELS, priorityBand, reportNumber } from "@/lib/labels";
import { formatMonth } from "@/lib/month";
import { summarizeMonth, type Typical } from "@/lib/monthlyReport";

const BANDS = ["critical", "high", "medium", "low"] as const;

/**
 * The month's reports as a paper document for the barangay's files or the municipality: totals,
 * how fast staff responded, the breakdowns, and every report. Statuses are as of `asOf`.
 */
export function MonthlyReportSheet({
  month,
  isCurrentMonth,
  reports,
  asOf,
}: {
  /** "2026-10" */
  month: string;
  /** The month isn't over yet, so its numbers are "so far". */
  isCurrentMonth: boolean;
  /** The reports that reached the barangay in the month, oldest first. */
  reports: ReportWithResponse[];
  /** When the page was loaded (ISO): the statuses are as of then. */
  asOf: string;
}) {
  const summary = summarizeMonth(reports);
  const monthName = formatMonth(month);

  return (
    <article className="text-[13px] leading-snug text-ink">
      <DocumentHeader title="Monthly incident report">
        <HeaderDetail label="Month">
          <span className="font-bold">{monthName}</span>
          {isCurrentMonth && " (so far)"}
        </HeaderDetail>
        <HeaderDetail label="Statuses as of">{formatDateTimeWithYear(asOf)}</HeaderDetail>
      </DocumentHeader>

      <DocumentSection title="Summary" className="mt-5">
        <div className="grid grid-cols-4 gap-3">
          <Total label="Reports received" value={summary.total} caption="Reached the barangay" />
          <Total label="Resolved" value={summary.byStatus.resolved} />
          <Total label="Still open" value={summary.open} caption="Received, responders on the way, or In progress" />
          <Total label="Invalid" value={summary.byStatus.invalid} caption="Not real, duplicate or spam" />
        </div>
      </DocumentSection>

      <DocumentSection title="How fast staff responded" className="mt-5">
        <dl className="grid grid-cols-2 gap-x-8">
          <TypicalTime
            label="Typical time to start"
            typical={summary.toFirstAction}
            basis={["report staff dispatched, started, or resolved", "reports staff dispatched, started, or resolved"]}
            empty="No reports started yet"
          />
          <TypicalTime
            label="Typical time to resolve"
            typical={summary.toResolved}
            basis={["resolved report", "resolved reports"]}
            empty="No reports resolved yet"
          />
        </dl>
        <p className="mt-1.5 text-xs text-muted">
          Counted from when a report reached the barangay. Typical is the middle value: half of the reports were
          faster and half were slower.
        </p>
      </DocumentSection>

      <DocumentSection title="By type" className="mt-5">
        {summary.byType.length === 0 ? (
          <p className="text-muted">None.</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-ink/40 text-muted">
                <Th>Type</Th>
                <Th numeric>Reports</Th>
                <Th numeric>Resolved</Th>
                <Th numeric>Still open</Th>
                <Th numeric>Invalid</Th>
              </tr>
            </thead>
            <tbody>
              {summary.byType.map((line) => (
                <tr key={line.category} className="border-b border-line">
                  <td className="py-1 pr-3 font-semibold">{line.label}</td>
                  <Td numeric>{line.total}</Td>
                  <Td numeric>{line.resolved}</Td>
                  <Td numeric>{line.open}</Td>
                  <Td numeric>{line.invalid}</Td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-1 pr-3">Total</td>
                <Td numeric>{summary.total}</Td>
                <Td numeric>{summary.byStatus.resolved}</Td>
                <Td numeric>{summary.open}</Td>
                <Td numeric>{summary.byStatus.invalid}</Td>
              </tr>
            </tbody>
          </table>
        )}
      </DocumentSection>

      <div className="mt-5 grid grid-cols-2 gap-x-8">
        <DocumentSection title="By priority">
          <dl>
            {BANDS.map((band) => (
              <Field key={band} label={PRIORITY_BAND_LABELS[band]}>
                {summary.byPriority[band]}
              </Field>
            ))}
          </dl>
          <p className="mt-1 text-xs text-muted">Not counting Invalid reports. Priority as it is now.</p>
        </DocumentSection>

        <DocumentSection title="Who reported">
          <dl>
            <Field label="Verified residents">{summary.reporters.verified}</Field>
            <Field label="Not yet verified">{summary.reporters.notVerified}</Field>
            <Field label="Guests">{summary.reporters.guest}</Field>
            <Field label="Outside Banaba">
              {summary.outsideBanaba}
              <Note>Reports sent from outside the barangay</Note>
            </Field>
          </dl>
        </DocumentSection>
      </div>

      <DocumentSection title={`All reports (${summary.total})`} keepTogether={false} className="mt-5">
        {reports.length === 0 ? (
          <p className="text-muted">No reports reached the barangay in {monthName}.</p>
        ) : (
          // A long list continues on the next pages; browsers repeat the column names there.
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-ink/40 text-muted">
                <Th>Reached the barangay</Th>
                <Th>Report no.</Th>
                <Th>Type</Th>
                <Th>Priority</Th>
                <Th>Status</Th>
                <Th>Reporter</Th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="break-inside-avoid border-b border-line align-top">
                  <td className="whitespace-nowrap py-1 pr-3">{formatDateTime(report.receivedAt)}</td>
                  <td className="whitespace-nowrap py-1 pr-3 tabular-nums">{reportNumber(report.id)}</td>
                  <td className="py-1 pr-3">{CATEGORY_LABELS[report.category]}</td>
                  <td className="whitespace-nowrap py-1 pr-3">
                    {report.priority === null
                      ? "Not scored"
                      : `${scoreOutOf100(report.priority)} ${PRIORITY_BAND_LABELS[priorityBand(report.priority)]}`}
                  </td>
                  <td className="whitespace-nowrap py-1 pr-3 font-semibold">{STAFF_STATUS_LABELS[report.status]}</td>
                  <td className="py-1">
                    {!report.reporter || report.reporter.isGuest ? "Guest reporter" : (report.reporter.name ?? "Resident")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DocumentSection>

      <SignatureFooter
        lines={[
          { label: "Prepared by", caption: "Signature over printed name" },
          { label: "Noted by", caption: "Punong Barangay" },
        ]}
        source={`From the BanabaConnect Command Dashboard · ${monthName} · Generated ${formatDateTimeWithYear(asOf)}`}
      />
    </article>
  );
}

/** One of the summary's totals, in a box that reads on a black-and-white printout. */
function Total({ label, value, caption }: { label: string; value: number; caption?: string }) {
  return (
    <div className="rounded border border-ink/30 px-3 py-2">
      <p className="text-muted">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value.toLocaleString("en-PH")}</p>
      {caption && <p className="text-xs text-muted">{caption}</p>}
    </div>
  );
}

function TypicalTime({
  label,
  typical,
  basis: [one, many],
  empty,
}: {
  label: string;
  typical: Typical;
  /** What it's based on, for one report and for several. */
  basis: [string, string];
  /** What to say when there's nothing to measure yet. */
  empty: string;
}) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd>
        {typical.medianMs === null ? (
          <span className="text-muted">{empty}</span>
        ) : (
          <span className="text-lg font-bold">{formatDuration(typical.medianMs)}</span>
        )}
        {typical.count > 0 && <Note>Based on {typical.count === 1 ? `1 ${one}` : `${typical.count} ${many}`}</Note>}
      </dd>
    </div>
  );
}

function Th({ numeric = false, children }: { numeric?: boolean; children: React.ReactNode }) {
  return (
    <th scope="col" className={`py-1 pr-3 font-semibold ${numeric ? "text-right" : ""}`}>
      {children}
    </th>
  );
}

function Td({ numeric = false, children }: { numeric?: boolean; children: React.ReactNode }) {
  return <td className={`py-1 pr-3 ${numeric ? "text-right tabular-nums" : ""}`}>{children}</td>;
}
