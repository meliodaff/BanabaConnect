import { currentReportOwner } from '@/features/auth/guestSession';
import { supabase, supabaseConfigured } from '@/features/auth/supabase';
import { listReports, saveServerStatuses } from './reportRepository';
import { reportsStore } from './reportsStore';
import type { ServerStatus } from './types';

// Status changes come from barangay staff, so checking once a minute is plenty.
const MIN_INTERVAL_MS = 60_000;
// Keeps each request URL short; the ids go in the query string.
const CHUNK_SIZE = 50;

/** The report's status plus its history, for the note staff wrote with the current status. */
export const STATUS_COLUMNS =
  'id, status, status_updated_at, history:report_status_history(to_status, note, changed_at)';

interface HistoryRow {
  to_status: string;
  note: string | null;
  changed_at: string;
}

/**
 * What staff wrote when they set the report's current status (e.g. why it's invalid), or null.
 * Earlier notes belong to earlier statuses, so they aren't shown.
 */
export function noteForCurrentStatus(history: HistoryRow[] | null | undefined, status: string): string | null {
  const latest = (history ?? [])
    .filter((change) => change.to_status === status)
    .sort((a, b) => b.changed_at.localeCompare(a.changed_at))[0];
  return latest?.note?.trim() || null;
}

let lastCheckedAt = 0;
let running: Promise<void> | null = null;

export interface RefreshStatusOptions {
  /** Check now even if the app checked less than a minute ago (pull to refresh, just sent). */
  force?: boolean;
}

/**
 * Fetches the barangay's status ("received", "in_progress", …) for reports this phone sent.
 * Row-level security only returns reports owned by the signed-in account (or guest account).
 */
export function refreshStatuses({ force = false }: RefreshStatusOptions = {}): Promise<void> {
  if (!supabaseConfigured) {
    return Promise.resolve();
  }
  if (running) {
    return running;
  }
  if (!force && Date.now() - lastCheckedAt < MIN_INTERVAL_MS) {
    return Promise.resolve();
  }
  lastCheckedAt = Date.now();
  running = fetchStatuses()
    .catch((error) => console.warn('Could not update report statuses', error))
    .finally(() => {
      running = null;
    });
  return running;
}

async function fetchStatuses() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    // Nothing has been sent from this phone yet.
    return;
  }

  const sentIds = (await listReports(await currentReportOwner()))
    .filter((report) => report.syncStatus === 'sent')
    .map((report) => report.submission.id);

  const statuses: ServerStatus[] = [];
  for (let start = 0; start < sentIds.length; start += CHUNK_SIZE) {
    const { data, error } = await supabase
      .from('reports')
      .select(STATUS_COLUMNS)
      .in('id', sentIds.slice(start, start + CHUNK_SIZE));
    if (error) {
      throw error;
    }
    for (const row of data ?? []) {
      // Kept even when this app version doesn't know the status, so the resident still sees an update.
      if (typeof row.status === 'string') {
        statuses.push({
          id: row.id,
          status: row.status,
          statusAt: row.status_updated_at,
          note: noteForCurrentStatus(row.history, row.status),
        });
      }
    }
  }

  if (statuses.length > 0) {
    await saveServerStatuses(statuses);
    await reportsStore.refresh();
  }
}
