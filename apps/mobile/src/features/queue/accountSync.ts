import { isReportCategory, isReportStatus } from '@banabaconnect/shared';
import { supabase, supabaseConfigured } from '@/features/auth/supabase';
import {
  adoptGuestReports,
  deleteOwnerReports,
  downloadReportPhoto,
  insertDownloadedReport,
  localReportIds,
} from './reportRepository';
import { reportsStore } from './reportsStore';
import { requestSync } from './syncEngine';

/**
 * Reports belong to an account, and the phone only keeps the signed-in account's copy:
 * - signing in links this phone's guest reports to the account and downloads the account's
 *   earlier reports (from another phone, or from before the last sign-out);
 * - signing out erases that account's reports from the phone. They stay on the server.
 */

// Enough history for the My Reports list; older reports stay on the server.
const DOWNLOAD_LIMIT = 200;
// The signed photo link only has to last until the download finishes.
const PHOTO_LINK_SECONDS = 300;

/** Run when an account is signed in: on sign-in and on every app start. */
export async function syncAccountReports(ownerId: string) {
  await adoptGuestReports(ownerId);
  await reportsStore.refresh();
  // Guest reports that never went out now go out under the account.
  void requestSync();
  try {
    await downloadAccountReports(ownerId);
  } catch (error) {
    // No signal, most likely. The next app start tries again.
    console.warn('Could not download this account’s reports', error);
  }
}

async function downloadAccountReports(ownerId: string) {
  if (!supabaseConfigured) {
    return;
  }
  // Filter by owner explicitly: for barangay staff, row-level security would return everyone's.
  const { data, error } = await supabase
    .from('reports')
    .select(
      'id, category, latitude, longitude, location_accuracy_m, description, incident_at, created_at, received_at, status, status_updated_at, photo_path, photo_width, photo_height',
    )
    .eq('reporter_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(DOWNLOAD_LIMIT);
  if (error) {
    throw error;
  }

  const known = await localReportIds();
  let added = 0;
  for (const row of data ?? []) {
    if (known.has(row.id) || !isReportCategory(row.category) || !isReportStatus(row.status)) {
      continue;
    }
    await insertDownloadedReport(
      {
        submission: {
          id: row.id,
          category: row.category,
          latitude: row.latitude,
          longitude: row.longitude,
          locationAccuracy: row.location_accuracy_m,
          description: row.description ?? '',
          incidentAt: row.incident_at,
          createdAt: row.created_at,
        },
        sentAt: row.received_at,
        serverStatus: row.status,
        serverStatusAt: row.status_updated_at,
        photo: await downloadPhoto(row),
      },
      ownerId,
    );
    added += 1;
  }

  if (added > 0) {
    await reportsStore.refresh();
  }
}

async function downloadPhoto(row: {
  id: string;
  photo_path: string | null;
  photo_width: number | null;
  photo_height: number | null;
}) {
  if (!row.photo_path) {
    return null;
  }
  try {
    const { data, error } = await supabase.storage
      .from('report-photos')
      .createSignedUrl(row.photo_path, PHOTO_LINK_SECONDS);
    if (error || !data) {
      throw error ?? new Error('No signed URL');
    }
    return {
      uri: await downloadReportPhoto(row.id, data.signedUrl),
      width: row.photo_width ?? 1,
      height: row.photo_height ?? 1,
    };
  } catch (error) {
    // The report still shows without its photo.
    console.warn('Could not download a report photo', error);
    return null;
  }
}

/** Run after signing out: the next person on this phone must not see this account's reports. */
export async function eraseAccountReports(ownerId: string) {
  await deleteOwnerReports(ownerId);
  await reportsStore.refresh();
}
