import { CATEGORY_LABELS, MCPS_WEIGHTS, VERIFICATION_LABELS } from "@banabaconnect/shared";
import {
  DocumentHeader,
  DocumentSection,
  Field,
  HeaderDetail,
  Note,
  SignatureFooter,
} from "@/components/PrintDocument";
import type { ReportDetail } from "@/lib/data";
import { formatDateTimeWithYear, formatDistance, scoreOutOf100, waitedForSignal } from "@/lib/format";
import {
  PRIORITY_BAND_LABELS,
  STAFF_STATUS_LABELS,
  groupedReportsHint,
  otherReportsLabel,
  priorityBand,
  reportNumber,
} from "@/lib/labels";

/**
 * One report as a paper document for the barangay's files, printed or saved as a PDF. The
 * report's page carries it hidden and shows only this when printing.
 */
export function IncidentReportSheet({
  report,
  asOf,
}: {
  report: ReportDetail;
  /** When the page with these details was loaded (ISO), printed as "Details as of". */
  asOf: string;
}) {
  const reporter = report.reporter;
  const waited = waitedForSignal(report.createdAt, report.receivedAt);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`;
  // The same parts as "Why this priority" on the report's page.
  const scoreParts = [
    { label: "Seriousness", value: report.severity, weight: MCPS_WEIGHTS.severity },
    { label: "nearby reports", value: report.volume, weight: MCPS_WEIGHTS.volume },
    { label: "reporter", value: report.credibility, weight: MCPS_WEIGHTS.credibility },
  ]
    .map((part) => `${part.label} +${Math.round((part.value ?? 0) * part.weight * 100)}`)
    .join(" · ");

  return (
    <article className="text-[13px] leading-snug text-ink">
      <DocumentHeader title="Incident report">
        <HeaderDetail label="Report no.">
          <span className="font-bold tabular-nums">{reportNumber(report.id)}</span>
        </HeaderDetail>
        <HeaderDetail label="Details as of">{formatDateTimeWithYear(asOf)}</HeaderDetail>
      </DocumentHeader>

      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-5">
        <DocumentSection title="Incident">
          <dl>
            <Field label="Type">{CATEGORY_LABELS[report.category]}</Field>
            <Field label="Priority">
              {report.priority === null
                ? "Not scored yet"
                : `${scoreOutOf100(report.priority)} / 100 · ${PRIORITY_BAND_LABELS[priorityBand(report.priority)]}`}
              {report.priority !== null && <Note>{scoreParts}</Note>}
            </Field>
            <Field label="Status">
              {STAFF_STATUS_LABELS[report.status]}
              <Note>Since {formatDateTimeWithYear(report.statusUpdatedAt)}</Note>
            </Field>
            <Field label="Happened">{formatDateTimeWithYear(report.incidentAt)}</Field>
            <Field label="Reported on the phone">{formatDateTimeWithYear(report.createdAt)}</Field>
            <Field label="Reached the barangay">
              {formatDateTimeWithYear(report.receivedAt)}
              {waited && <Note>Waited {waited} for signal</Note>}
            </Field>
            <Field label="Nearby reports">
              {report.clusterCount > 1 ? (
                <>
                  {otherReportsLabel(report.clusterCount)}
                  <Note>{groupedReportsHint(report.clusterPeople)}</Note>
                </>
              ) : (
                "None"
              )}
            </Field>
          </dl>
        </DocumentSection>

        <div className="space-y-5">
          <DocumentSection title="Reporter">
            <dl>
              {!reporter || reporter.isGuest ? (
                <Field label="Name">
                  Guest reporter
                  <Note>Reported without an account, so there&apos;s no name or number.</Note>
                </Field>
              ) : (
                <>
                  <Field label="Name">{reporter.name ?? "No name"}</Field>
                  <Field label="Barangay ID">{VERIFICATION_LABELS[reporter.verification]}</Field>
                  <Field label="Mobile">{reporter.phone ?? "Not given"}</Field>
                  <Field label="Sitio / purok">{reporter.area ?? "Not given"}</Field>
                  <Field label="Address">{reporter.address ?? "Not given"}</Field>
                </>
              )}
            </dl>
          </DocumentSection>

          <DocumentSection title="Location">
            <dl>
              <Field label="Coordinates">
                {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                {report.accuracy !== null && <Note>Accurate to about {Math.round(report.accuracy)} m</Note>}
              </Field>
              {report.outsideBanabaM !== null && (
                <Field label="Outside Banaba">
                  Sent from {formatDistance(report.outsideBanabaM)} outside Barangay Banaba
                </Field>
              )}
              <Field label="Map">
                {/* Clickable in a saved PDF. */}
                <a href={mapUrl} className="break-all font-normal underline">
                  {mapUrl.replace("https://www.", "")}
                </a>
              </Field>
            </dl>
          </DocumentSection>
        </div>
      </div>

      <DocumentSection title="What the resident reported" className="mt-4">
        <div className={`grid gap-x-8 gap-y-3 ${report.photoUrl ? "grid-cols-2" : ""}`}>
          <p className="whitespace-pre-wrap">
            {report.description || <span className="text-muted">No description.</span>}
          </p>
          {report.photoUrl ? (
            // A signed, short-lived Supabase link, so next/image optimization isn't used.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={report.photoUrl}
              alt={`Photo of the ${CATEGORY_LABELS[report.category].toLowerCase()} report`}
              className="max-h-[55mm] w-full object-contain"
            />
          ) : (
            <p className="text-muted">{report.hasPhoto ? "The photo couldn't be loaded." : "No photo was sent."}</p>
          )}
        </div>
      </DocumentSection>

      <DocumentSection title="Status history" className="mt-4">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-ink/40 text-muted">
              <th scope="col" className="py-1 pr-3 font-semibold">
                Date and time
              </th>
              <th scope="col" className="py-1 pr-3 font-semibold">
                Status
              </th>
              <th scope="col" className="py-1 pr-3 font-semibold">
                By
              </th>
              <th scope="col" className="py-1 font-semibold">
                Note
              </th>
            </tr>
          </thead>
          <tbody>
            {report.history.map((change) => (
              <tr key={change.id} className="break-inside-avoid border-b border-line align-top">
                <td className="whitespace-nowrap py-1.5 pr-3">{formatDateTimeWithYear(change.changedAt)}</td>
                <td className="whitespace-nowrap py-1.5 pr-3 font-semibold">{STAFF_STATUS_LABELS[change.to]}</td>
                <td className="whitespace-nowrap py-1.5 pr-3">
                  {change.byStaff ? (change.changedBy ?? "Barangay staff") : "Reporter"}
                </td>
                <td className="py-1.5">{change.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocumentSection>

      <SignatureFooter
        lines={[{ label: "Prepared by", caption: "Signature over printed name" }, { label: "Date" }]}
        source={`From the BanabaConnect Command Dashboard · Report ID ${report.id}`}
      />
    </article>
  );
}
