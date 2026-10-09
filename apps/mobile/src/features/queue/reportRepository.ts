import { Directory, File, Paths } from 'expo-file-system';
import type { LocalSyncStatus, ReportCategory, ReportSubmission } from '@banabaconnect/shared';
import { getDb } from './db';
import type { PhotoToSave, QueuedReport } from './types';

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
    syncStatus: row.sync_status as LocalSyncStatus,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error,
    sentAt: row.sent_at,
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

/** Copies the photo out of the cache folder, which Android may clear at any time. */
async function persistPhoto(reportId: string, photo: PhotoToSave): Promise<File> {
  const directory = new Directory(Paths.document, 'report-photos');
  directory.create({ intermediates: true, idempotent: true });
  const destination = new File(directory, `${reportId}.jpg`);
  await new File(photo.uri).copy(destination, { overwrite: true });
  return destination;
}

/** Saves a report (and its photo) on the phone. Sending happens separately. */
export async function saveReport(submission: ReportSubmission, photo: PhotoToSave | null) {
  const db = await getDb();
  const photoFile = photo ? await persistPhoto(submission.id, photo) : null;

  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO reports
          (id, category, latitude, longitude, location_accuracy, description, incident_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        submission.id,
        submission.category,
        submission.latitude,
        submission.longitude,
        submission.locationAccuracy,
        submission.description,
        submission.incidentAt,
        submission.createdAt,
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

/** All reports on this phone, newest first. */
export async function listReports(): Promise<QueuedReport[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReportRow>(`${SELECT_REPORTS} ORDER BY r.created_at DESC`);
  return rows.map(toQueuedReport);
}

/** Reports not yet accepted by the server and due for another attempt. */
export async function dueReports(now: number, ignoreBackoff: boolean): Promise<QueuedReport[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReportRow>(
    `${SELECT_REPORTS} WHERE r.sync_status = 'queued' AND (? OR r.next_attempt_at <= ?)`,
    ignoreBackoff ? 1 : 0,
    now,
  );
  return rows.map(toQueuedReport);
}

/** Photos whose report has been sent, still waiting to upload. */
export async function duePhotos(now: number, ignoreBackoff: boolean): Promise<QueuedReport[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReportRow>(
    `${SELECT_REPORTS}
     WHERE r.sync_status = 'sent' AND p.sync_status = 'queued' AND (? OR p.next_attempt_at <= ?)`,
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
