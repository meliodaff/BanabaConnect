import type { LocalSyncStatus, ReportSubmission } from '@banabaconnect/shared';

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
  syncStatus: LocalSyncStatus;
  attempts: number;
  /** Epoch ms; the sync engine skips the report until then (retry backoff). */
  nextAttemptAt: number;
  lastError: string | null;
  sentAt: string | null;
  photo: QueuedPhoto | null;
}

export interface PhotoToSave {
  uri: string;
  width: number;
  height: number;
}
