// In-memory stand-in for web previews: expo-sqlite's web support is still alpha.
// Same API as reportRepository.ts; nothing survives a page reload.
import type { ReportSubmission } from '@banabaconnect/shared';
import type { DownloadedReport, PhotoToSave, QueuedReport, ServerStatus } from './types';

const reports = new Map<string, QueuedReport>();

export async function saveReport(
  submission: ReportSubmission,
  photo: PhotoToSave | null,
  ownerId: string | null,
) {
  reports.set(submission.id, {
    submission,
    ownerId,
    syncStatus: 'queued',
    attempts: 0,
    nextAttemptAt: 0,
    lastError: null,
    sentAt: null,
    photo: photo ? { ...photo, syncStatus: 'queued', attempts: 0, nextAttemptAt: 0 } : null,
    serverStatus: null,
    serverStatusAt: null,
    serverNote: null,
  });
}

export async function listReports(ownerId: string | null): Promise<QueuedReport[]> {
  return [...reports.values()].filter((r) => r.ownerId === ownerId).sort((a, b) =>
    b.submission.createdAt.localeCompare(a.submission.createdAt),
  );
}

export async function dueReports(ownerId: string | null, now: number, ignoreBackoff: boolean) {
  return [...reports.values()].filter(
    (r) =>
      r.ownerId === ownerId &&
      r.syncStatus === 'queued' &&
      (ignoreBackoff || r.nextAttemptAt <= now),
  );
}

export async function duePhotos(ownerId: string | null, now: number, ignoreBackoff: boolean) {
  return [...reports.values()].filter(
    (r) =>
      r.ownerId === ownerId &&
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

export async function saveServerStatuses(statuses: ServerStatus[]) {
  for (const { id, status, statusAt, note } of statuses) {
    update(id, (r) => ({ ...r, serverStatus: status, serverStatusAt: statusAt, serverNote: note }));
  }
}

export async function adoptGuestReports(ownerId: string) {
  for (const [id, report] of reports) {
    if (report.ownerId === null) {
      reports.set(id, { ...report, ownerId });
    }
  }
}

export async function localReportIds(): Promise<Set<string>> {
  return new Set(reports.keys());
}

/** The web preview shows the (short-lived) signed URL directly instead of saving a file. */
export async function downloadReportPhoto(_reportId: string, url: string): Promise<string> {
  return url;
}

export async function insertDownloadedReport(report: DownloadedReport, ownerId: string) {
  if (reports.has(report.submission.id)) {
    return;
  }
  reports.set(report.submission.id, {
    submission: report.submission,
    ownerId,
    syncStatus: 'sent',
    attempts: 0,
    nextAttemptAt: 0,
    lastError: null,
    sentAt: report.sentAt,
    photo: report.photo
      ? { ...report.photo, syncStatus: 'sent', attempts: 0, nextAttemptAt: 0 }
      : null,
    serverStatus: report.serverStatus,
    serverStatusAt: report.serverStatusAt,
    serverNote: report.serverNote,
  });
}

export async function deleteOwnerReports(ownerId: string) {
  for (const [id, report] of reports) {
    if (report.ownerId === ownerId) {
      reports.delete(id);
    }
  }
}
