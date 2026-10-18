import { AppState } from 'react-native';
import type { ReportCategory } from '@banabaconnect/shared';
import { currentReportOwner } from '@/features/auth/guestSession';
import {
  duePhotos,
  dueReports,
  markPhotoRetry,
  markPhotoSent,
  markReportRetry,
  markReportSent,
} from './reportRepository';
import { reportsStore } from './reportsStore';
import { refreshStatuses } from './statusSync';
import { enqueueNativeReport } from './nativeReportUpload';
import { hasConnection, OfflineError, transport } from './transport';
import type { QueuedReport } from './types';

// Waits between failed attempts: 30 s, 2 min, then every 10 min.
const RETRY_DELAYS_MS = [30_000, 120_000, 600_000];

// Life-safety reports go first when several are waiting. Draft order: the per-category
// severity values are still an open question in the project doc.
const SYNC_PRIORITY: ReportCategory[] = [
  'medical',
  'fire',
  'flood',
  'power_line',
  'accident',
  'crime',
  'road_blockage',
  'other',
];

function retryDelay(attempts: number) {
  return RETRY_DELAYS_MS[Math.min(attempts, RETRY_DELAYS_MS.length) - 1];
}

function byPriority(a: QueuedReport, b: QueuedReport) {
  const rank =
    SYNC_PRIORITY.indexOf(a.submission.category) - SYNC_PRIORITY.indexOf(b.submission.category);
  return rank !== 0 ? rank : a.submission.createdAt.localeCompare(b.submission.createdAt);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/** The server rejected the request's sign-in (HTTP 401), e.g. a token that expired while waiting. */
function isExpiredSession(error: unknown) {
  return (error as { status?: unknown } | null)?.status === 401;
}

// Reports already retried once after an expired session, so a lasting 401 falls back to the delays.
const retriedExpiredSession = new Set<string>();

export interface SyncOptions {
  /** Try everything now, ignoring retry delays (e.g. signal just came back). */
  ignoreBackoff?: boolean;
  /** No UI feedback or status polling during an OS background execution window. */
  background?: boolean;
  /** Stop starting uploads when iOS expires the task; unfinished work stays in SQLite. */
  shouldContinue?: () => boolean;
}

let running: Promise<void> | null = null;
let pending: SyncOptions | null = null;

/**
 * Sends waiting reports, then their photos. Only one sync runs at a time; a request
 * made during a run is remembered and runs right after it.
 */
export function requestSync(options: SyncOptions = {}): Promise<void> {
  if (running) {
    const previous = pending;
    pending = previous ? {
      ignoreBackoff: Boolean(previous.ignoreBackoff || options.ignoreBackoff),
      background: Boolean(previous.background && options.background),
      shouldContinue: () =>
        (previous.shouldContinue?.() ?? true) || (options.shouldContinue?.() ?? true),
    } : options;
    return running;
  }
  running = drainSyncs(options);
  return running;
}

/** Every caller waits for the queued passes too, including a background task's caller. */
async function drainSyncs(options: SyncOptions) {
  let next: SyncOptions | null = options;
  try {
    while (next) {
      try {
        await syncOnce(next);
      } catch (error) {
        console.warn('Report sync failed', error);
      }
      next = pending;
      pending = null;
    }
  } finally {
    // Release synchronously with the last pending check, before the promise resolves.
    running = null;
  }
}

async function syncOnce({ ignoreBackoff = false, background = false, shouldContinue }: SyncOptions) {
  // Text reports first: they are small and let the barangay act even before photos arrive.
  // Only the signed-in account's (or the guest's) reports. Another account's wait until it signs back in.
  const owner = await currentReportOwner();
  const reports = (await dueReports(owner, Date.now(), ignoreBackoff)).sort(byPriority);
  let sentAny = false;
  let handedOffAny = false;
  // iOS holds a handed-off upload until signal returns; offline, it should read "waiting", not "sending".
  const showSending = !background && reports.length > 0 && (await hasConnection());
  for (const report of reports) {
    if (shouldContinue && !shouldContinue()) {
      return;
    }
    const id = report.submission.id;
    let handedOff = false;
    if (showSending) reportsStore.setSending(id, true);
    try {
      handedOff = await enqueueNativeReport(report, {
        onSent: async () => {
          retriedExpiredSession.delete(id);
          await markReportSent(id, new Date().toISOString());
          reportsStore.setSending(id, false);
          if (AppState.currentState === 'active') await reportsStore.refresh();
          // Pick up photos after the report exists. This also reconciles the UI on return.
          void requestSync({ background: AppState.currentState !== 'active' });
        },
        onFailed: async (error) => {
          const attempts = report.attempts + 1;
          // An upload that waited a long time for signal can carry an expired token. Retry once
          // right away: the server answered, so the session can refresh now.
          const retryNow = isExpiredSession(error) && !retriedExpiredSession.has(id);
          if (retryNow) retriedExpiredSession.add(id);
          const nextAttemptAt = Date.now() + (retryNow ? 0 : retryDelay(attempts));
          await markReportRetry(id, attempts, nextAttemptAt, errorMessage(error));
          reportsStore.setSending(id, false);
          if (AppState.currentState === 'active') await reportsStore.refresh();
          if (retryNow) void requestSync({ background: AppState.currentState !== 'active' });
        },
      });
      if (handedOff) {
        handedOffAny = true;
        if (!showSending && !background) reportsStore.setSending(id, false);
        continue;
      }
      await transport.sendReport(report.submission);
      await markReportSent(id, new Date().toISOString());
      sentAny = true;
      if (!background && report.attempts > 0 && AppState.currentState === 'active') {
        // It waited for signal, so the resident may not be watching. First tries show on the sent screen.
        const { notifyReportSent } = await import('./syncFeedback');
        notifyReportSent(id, report.submission.category);
      }
    } catch (error) {
      const attempts = report.attempts + 1;
      await markReportRetry(id, attempts, Date.now() + retryDelay(attempts), errorMessage(error));
      if (error instanceof OfflineError) {
        return;
      }
    } finally {
      if (!background && !handedOff) {
        reportsStore.setSending(id, false);
        await reportsStore.refresh();
      }
    }
  }

  const photos = (await duePhotos(owner, Date.now(), ignoreBackoff)).sort(byPriority);
  for (const report of photos) {
    if (shouldContinue && !shouldContinue()) {
      return;
    }
    if (!report.photo) {
      continue;
    }
    const id = report.submission.id;
    if (!background) reportsStore.setSending(id, true);
    try {
      await transport.uploadPhoto(id, report.photo);
      await markPhotoSent(id);
    } catch (error) {
      const attempts = report.photo.attempts + 1;
      await markPhotoRetry(id, attempts, Date.now() + retryDelay(attempts), errorMessage(error));
      if (error instanceof OfflineError) {
        return;
      }
    } finally {
      if (!background) {
        reportsStore.setSending(id, false);
        await reportsStore.refresh();
      }
    }
  }

  // Pick up the barangay's status changes; right away when something new was just sent.
  if (!background) {
    await reportsStore.refresh();
    // Avoid an offline status request holding the queue while native uploads wait for signal.
    if (!handedOffAny) await refreshStatuses({ force: sentAny });
  }
}
