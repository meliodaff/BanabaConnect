/**
 * The report contract shared by the mobile app and the dashboard.
 * The phone creates a report with these fields and sends them to the `submit_report`
 * database function (supabase/migrations/20261012000000_report_submission.sql).
 */

// Draft list. Severity values per category are still an open question (see the
// project doc), so they are deliberately not defined here yet.
export const REPORT_CATEGORIES = [
  'flood',
  'fire',
  'medical',
  'accident',
  'crime',
  'road_blockage',
  'power_line',
  'other',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export function isReportCategory(value: unknown): value is ReportCategory {
  return typeof value === 'string' && (REPORT_CATEGORIES as readonly string[]).includes(value);
}

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  flood: 'Flood',
  fire: 'Fire',
  medical: 'Medical emergency',
  accident: 'Accident',
  crime: 'Crime',
  road_blockage: 'Road blocked',
  power_line: 'Fallen power line',
  other: 'Other',
};

export const DESCRIPTION_MAX_LENGTH = 500;

/** What the phone sends to the server. `id` is a UUID generated on the phone. */
export interface ReportSubmission {
  id: string;
  category: ReportCategory;
  latitude: number;
  longitude: number;
  /** GPS accuracy radius in meters, if the device reported one. */
  locationAccuracy: number | null;
  description: string;
  /** ISO 8601 timestamp of when the incident happened. */
  incidentAt: string;
  /** ISO 8601 timestamp of when the report was saved on the phone. */
  createdAt: string;
}

/** Status set by barangay admins on the dashboard. */
export const REPORT_STATUSES = ['received', 'in_progress', 'resolved', 'invalid'] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** How a report's status reads to the resident who sent it. */
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  received: 'Received by the barangay',
  in_progress: 'Being handled',
  resolved: 'Resolved',
  invalid: 'Closed',
};

export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === 'string' && (REPORT_STATUSES as readonly string[]).includes(value);
}

/** Delivery state of a report on the phone, shown to the resident. */
export type LocalSyncStatus =
  | 'queued' // "Saved – waiting for signal"
  | 'sent'; // accepted by the server

/** MCPS weights from the Thesis 1 manuscript: P = 0.5·S + 0.3·V + 0.2·C. */
export const MCPS_WEIGHTS = {
  severity: 0.5,
  volume: 0.3,
  credibility: 0.2,
} as const;
