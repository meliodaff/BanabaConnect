import { isReportStatus, type LocalSyncStatus, type ReportStatus, type ReportSubmission } from '@banabaconnect/shared';

/** The barangay's status as this app understands it. 'unrecognized' is one a newer dashboard added. */
export type ResidentStatus = ReportStatus | 'unrecognized';

/** Keeps an unknown status visible as an update instead of dropping it, so older apps still show a change. */
export function toResidentStatus(raw: string | null | undefined): ResidentStatus | null {
  if (!raw) return null;
  return isReportStatus(raw) ? raw : 'unrecognized';
}

export interface QueuedPhoto {
  /** Copy in the app's documents folder, so Android can't clear it before upload. */
  uri: string;
  width: number;
  height: number;
  syncStatus: LocalSyncStatus;
  attempts: number;
  nextAttemptAt: number;
}

/** A report saved on the phone, with its delivery state. */
export interface QueuedReport {
  submission: ReportSubmission;
  /** The account that made the report, or null for a guest. Only the owner sees and sends it. */
  ownerId: string | null;
  syncStatus: LocalSyncStatus;
  attempts: number;
  /** Epoch ms; the sync engine skips the report until then (retry backoff). */
  nextAttemptAt: number;
  lastError: string | null;
  sentAt: string | null;
  photo: QueuedPhoto | null;
  /** The barangay's status once the report is sent; null until the app has checked. */
  serverStatus: ResidentStatus | null;
  serverStatusAt: string | null;
  /** What barangay staff wrote with the current status, if anything. */
  serverNote: string | null;
}

/** A report the account sent earlier, downloaded from Supabase. */
export interface DownloadedReport {
  submission: ReportSubmission;
  sentAt: string;
  /** As stored in Supabase, possibly a status this app version doesn't know. */
  serverStatus: string;
  serverStatusAt: string;
  serverNote: string | null;
  photo: PhotoToSave | null;
}

/** A sent report's status as stored in Supabase. */
export interface ServerStatus {
  id: string;
  /** As stored in Supabase, possibly a status this app version doesn't know. */
  status: string;
  statusAt: string;
  /** Staff's note for this status (e.g. why it's invalid), or null. */
  note: string | null;
}

export interface PhotoToSave {
  uri: string;
  width: number;
  height: number;
}
