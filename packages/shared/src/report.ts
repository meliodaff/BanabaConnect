/**
 * The report contract shared by the mobile app and the dashboard.
 * The phone creates a report with these fields and sends them to the `submit_report`
 * database function (supabase/migrations/20261012000000_report_submission.sql).
 */

// Draft list. Severity values per category are still an open question (see the
// project doc), so they are deliberately not defined here yet.
// 'sos' is the one-tap emergency from the widget or shortcut: the resident had no time to say
// what is happening. It is always Critical (see 20261019000001_sos_reports.sql).
export const REPORT_CATEGORIES = [
  'sos',
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
  sos: 'SOS',
  flood: 'Flood',
  fire: 'Fire',
  medical: 'Medical emergency',
  accident: 'Accident',
  crime: 'Crime',
  road_blockage: 'Road blocked',
  power_line: 'Fallen power line',
  other: 'Other',
};

/** What residents choose from in the New report form. SOS has its own one-tap screen. */
export const PICKER_CATEGORIES = REPORT_CATEGORIES.filter(
  (category): category is Exclude<ReportCategory, 'sos'> => category !== 'sos',
);

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
  /**
   * SOS only: true when the phone's own fingerprint, face, PIN or password confirmed the send,
   * false when the phone has no screen lock (the resident held the button instead).
   * Absent for other reports.
   */
  phoneLockConfirmed?: boolean | null;
}

/** Status set by barangay admins on the dashboard. */
export const REPORT_STATUSES = ['received', 'dispatched', 'in_progress', 'resolved', 'invalid'] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const ACTIVE_REPORT_STATUSES = ['received', 'dispatched', 'in_progress'] as const;

export function isActiveReportStatus(status: ReportStatus): boolean {
  return ACTIVE_REPORT_STATUSES.some((active) => active === status);
}

/** How a report's status reads to the resident who sent it. */
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  received: 'Natanggap na ng barangay',
  dispatched: 'Papunta na ang responders',
  in_progress: 'Inaasikaso na ang report',
  resolved: 'Naayos na ang report',
  invalid: 'Isinara ang report',
};

/** Also shown to staff before they save an update. Dispatch is an explicit staff action. */
export const REPORT_STATUS_DETAILS: Record<ReportStatus, string> = {
  received: 'Natanggap na po ng barangay ang report mo. Susuriin ito ng barangay staff.',
  dispatched: 'Papunta na po ang responders sa iniulat na lokasyon. Manatili sa ligtas na lugar.',
  in_progress: 'Nasa lokasyon na po ang mga tauhan ng barangay at inaasikaso na nila ang sitwasyon.',
  resolved: 'Minarkahan na po ng barangay na naayos na ang iniulat na insidente.',
  invalid: 'Isinara na po ng barangay ang report mo. Basahin ang mensahe ng barangay para sa dahilan.',
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
