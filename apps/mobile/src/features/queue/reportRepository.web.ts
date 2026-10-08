// In-memory stand-in for web previews: expo-sqlite's web support is still alpha.
// Same API as reportRepository.ts; nothing survives a page reload.
import type { ReportSubmission } from '@banabaconnect/shared';
import type { PhotoToSave, QueuedReport } from './types';

const reports = new Map<string, QueuedReport>();

export async function saveReport(submission: ReportSubmission, photo: PhotoToSave | null) {
  reports.set(submission.id, {
    submission,
    syncStatus: 'queued',
    attempts: 0,
    nextAttemptAt: 0,
    lastError: null,
    sentAt: null,
    photo: photo ? { ...photo, syncStatus: 'queued', attempts: 0, nextAttemptAt: 0 } : null,
  });
}

export async function listReports(): Promise<QueuedReport[]> {
  return [...reports.values()].sort((a, b) =>
    b.submission.createdAt.localeCompare(a.submission.createdAt),
  );
}

export async function dueReports(now: number, ignoreBackoff: boolean) {
  return [...reports.values()].filter(
    (r) => r.syncStatus === 'queued' && (ignoreBackoff || r.nextAttemptAt <= now),
  );
}

export async function duePhotos(now: number, ignoreBackoff: boolean) {
  return [...reports.values()].filter(
    (r) =>
      r.syncStatus === 'sent' &&
      r.photo?.syncStatus === 'queued' &&
      (ignoreBackoff || r.photo.nextAttemptAt <= now),
  );
}

function update(id: string, change: (report: QueuedReport) => QueuedReport) {
  const report = reports.get(id);
  if (report) {
    reports.set(id, change(report));
  }
}

export async function markReportSent(id: string, sentAt: string) {
  update(id, (r) => ({ ...r, syncStatus: 'sent', sentAt, lastError: null }));
}

export async function markReportRetry(id: string, attempts: number, nextAttemptAt: number, error: string) {
  update(id, (r) => ({ ...r, attempts, nextAttemptAt, lastError: error }));
}

export async function markPhotoSent(reportId: string) {
  update(reportId, (r) => (r.photo ? { ...r, photo: { ...r.photo, syncStatus: 'sent' } } : r));
}

export async function markPhotoRetry(reportId: string, attempts: number, nextAttemptAt: number) {
  update(reportId, (r) => (r.photo ? { ...r, photo: { ...r.photo, attempts, nextAttemptAt } } : r));
}
