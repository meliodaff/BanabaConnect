import { Directory, File, Paths } from 'expo-file-system';
import {
  isReportStatus,
  type LocalSyncStatus,
  type ReportCategory,
  type ReportSubmission,
} from '@banabaconnect/shared';
import { getDb } from './db';
import type { DownloadedReport, PhotoToSave, QueuedReport, ServerStatus } from './types';

interface ReportRow {
  id: string;
  category: string;
  latitude: number;
  longitude: number;
  location_accuracy: number | null;
  description: string;
  incident_at: string;
  created_at: string;
  sync_status: string;
  attempts: number;
  next_attempt_at: number;
  last_error: string | null;
  sent_at: string | null;
  owner_id: string | null;
  server_status: string | null;
  server_status_at: string | null;
  photo_uri: string | null;
  photo_width: number | null;
  photo_height: number | null;
  photo_sync_status: string | null;
  photo_attempts: number | null;
  photo_next_attempt_at: number | null;
}

const SELECT_REPORTS = `
  SELECT r.*,
    p.uri AS photo_uri, p.width AS photo_width, p.height AS photo_height,
    p.sync_status AS photo_sync_status, p.attempts AS photo_attempts,
    p.next_attempt_at AS photo_next_attempt_at
  FROM reports r
  LEFT JOIN report_photos p ON p.report_id = r.id
`;

function toQueuedReport(row: ReportRow): QueuedReport {
  return {
    submission: {
      id: row.id,
      category: row.category as ReportCategory,
      latitude: row.latitude,
      longitude: row.longitude,
      locationAccuracy: row.location_accuracy,
      description: row.description,
      incidentAt: row.incident_at,
      createdAt: row.created_at,
    },
    ownerId: row.owner_id,
    syncStatus: row.sync_status as LocalSyncStatus,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error,
    sentAt: row.sent_at,
    serverStatus: isReportStatus(row.server_status) ? row.server_status : null,
    serverStatusAt: row.server_status_at,
    photo:
      row.photo_uri === null
        ? null
        : {
            uri: row.photo_uri,
            width: row.photo_width ?? 0,
            height: row.photo_height ?? 0,
            syncStatus: (row.photo_sync_status ?? 'queued') as LocalSyncStatus,
            attempts: row.photo_attempts ?? 0,
            nextAttemptAt: row.photo_next_attempt_at ?? 0,
          },
  };
}

/** Where a report's photo lives on the phone. */
function photoFileFor(reportId: string): File {
  const directory = new Directory(Paths.document, 'report-photos');
  directory.create({ intermediates: true, idempotent: true });
  return new File(directory, `${reportId}.jpg`);
}

/** Copies the photo out of the cache folder, which Android may clear at any time. */
async function persistPhoto(reportId: string, photo: PhotoToSave): Promise<File> {
  const destination = photoFileFor(reportId);
  await new File(photo.uri).copy(destination, { overwrite: true });
  return destination;
}

/**
 * Saves a report (and its photo) on the phone. Sending happens separately.
 * `ownerId` is the signed-in account, or null for a guest.
 */
export async function saveReport(
  submission: ReportSubmission,
  photo: PhotoToSave | null,
  ownerId: string | null,
) {
  const db = await getDb();
  const photoFile = photo ? await persistPhoto(submission.id, photo) : null;

  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO reports
          (id, category, latitude, longitude, location_accuracy, description, incident_at, created_at, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        submission.id,
        submission.category,
        submission.latitude,
        submission.longitude,
        submission.locationAccuracy,
        submission.description,
        submission.incidentAt,
        submission.createdAt,
        ownerId,
      );
      if (photo && photoFile) {
        await db.runAsync(
          'INSERT INTO report_photos (report_id, uri, width, height) VALUES (?, ?, ?, ?)',
          submission.id,
          photoFile.uri,
          photo.width,
          photo.height,
        );
      }
    });
  } catch (error) {
    if (photoFile?.exists) {
      photoFile.delete();
    }
    throw error;
  }
}

/** The owner's reports on this phone, newest first. `ownerId` null means the guest's. */
export async function listReports(ownerId: string | null): Promise<QueuedReport[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReportRow>(
    `${SELECT_REPORTS} WHERE r.owner_id IS ? ORDER BY r.created_at DESC`,
    ownerId,
  );
  return rows.map(toQueuedReport);
}

/** The owner's reports not yet accepted by the server and due for another attempt. */
export async function dueReports(
  ownerId: string | null,
  now: number,
  ignoreBackoff: boolean,
): Promise<QueuedReport[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReportRow>(
    `${SELECT_REPORTS}
     WHERE r.owner_id IS ? AND r.sync_status = 'queued' AND (? OR r.next_attempt_at <= ?)`,
    ownerId,
    ignoreBackoff ? 1 : 0,
    now,
  );
  return rows.map(toQueuedReport);
}

/** The owner's photos whose report has been sent, still waiting to upload. */
export async function duePhotos(
  ownerId: string | null,
  now: number,
  ignoreBackoff: boolean,
): Promise<QueuedReport[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReportRow>(
    `${SELECT_REPORTS}
     WHERE r.owner_id IS ? AND r.sync_status = 'sent' AND p.sync_status = 'queued'
       AND (? OR p.next_attempt_at <= ?)`,
    ownerId,
    ignoreBackoff ? 1 : 0,
    now,
  );
  return rows.map(toQueuedReport);
}

export async function markReportSent(id: string, sentAt: string) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE reports SET sync_status = 'sent', sent_at = ?, last_error = NULL WHERE id = ?",
    sentAt,
    id,
  );
}

export async function markReportRetry(id: string, attempts: number, nextAttemptAt: number, error: string) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE reports SET attempts = ?, next_attempt_at = ?, last_error = ? WHERE id = ?',
    attempts,
    nextAttemptAt,
    error,
    id,
  );
}

export async function markPhotoSent(reportId: string) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE report_photos SET sync_status = 'sent', last_error = NULL WHERE report_id = ?",
    reportId,
  );
}

export async function markPhotoRetry(
  reportId: string,
  attempts: number,
  nextAttemptAt: number,
  error: string,
) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE report_photos SET attempts = ?, next_attempt_at = ?, last_error = ? WHERE report_id = ?',
    attempts,
    nextAttemptAt,
    error,
    reportId,
  );
}

/** Saves the barangay's latest status for reports this phone sent. */
export async function saveServerStatuses(statuses: ServerStatus[]) {
  if (statuses.length === 0) {
    return;
  }
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const { id, status, statusAt } of statuses) {
      await db.runAsync(
        'UPDATE reports SET server_status = ?, server_status_at = ? WHERE id = ?',
        status,
        statusAt,
        id,
      );
    }
  });
}

/** Guest reports on this phone move to the account the guest signs into. */
export async function adoptGuestReports(ownerId: string) {
  const db = await getDb();
  await db.runAsync('UPDATE reports SET owner_id = ? WHERE owner_id IS NULL', ownerId);
}

/** Ids of every report saved on this phone, whoever owns it. */
export async function localReportIds(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string }>('SELECT id FROM reports');
  return new Set(rows.map((row) => row.id));
}

/** Downloads a report's photo from a (signed) URL and returns where it was saved. */
export async function downloadReportPhoto(reportId: string, url: string): Promise<string> {
  const file = await File.downloadFileAsync(url, photoFileFor(reportId), { idempotent: true });
  return file.uri;
}

/** Saves a report that the account sent earlier (e.g. from another phone) as already sent. */
export async function insertDownloadedReport(report: DownloadedReport, ownerId: string) {
  const db = await getDb();
  const { submission, photo } = report;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR IGNORE INTO reports
        (id, category, latitude, longitude, location_accuracy, description, incident_at, created_at,
         owner_id, sync_status, sent_at, server_status, server_status_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?, ?)`,
      submission.id,
      submission.category,
      submission.latitude,
      submission.longitude,
      submission.locationAccuracy,
      submission.description,
      submission.incidentAt,
      submission.createdAt,
      ownerId,
      report.sentAt,
      report.serverStatus,
      report.serverStatusAt,
    );
    if (photo) {
      await db.runAsync(
        `INSERT OR IGNORE INTO report_photos (report_id, uri, width, height, sync_status)
         VALUES (?, ?, ?, ?, 'sent')`,
        submission.id,
        photo.uri,
        photo.width,
        photo.height,
      );
    }
  });
}

/** Erases an account's reports and photos from this phone (they stay on the server). */
export async function deleteOwnerReports(ownerId: string) {
  const db = await getDb();
  const photos = await db.getAllAsync<{ uri: string }>(
    `SELECT p.uri FROM report_photos p JOIN reports r ON r.id = p.report_id WHERE r.owner_id = ?`,
    ownerId,
  );
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'DELETE FROM report_photos WHERE report_id IN (SELECT id FROM reports WHERE owner_id = ?)',
      ownerId,
    );
    await db.runAsync('DELETE FROM reports WHERE owner_id = ?', ownerId);
  });
  for (const { uri } of photos) {
    try {
      const file = new File(uri);
      if (file.exists) {
        file.delete();
      }
    } catch (error) {
      console.warn('Could not delete a report photo', error);
    }
  }
}
