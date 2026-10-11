import { router } from 'expo-router';
import { CATEGORY_LABELS, type ReportCategory } from '@banabaconnect/shared';
import { icons } from '@/components/Icon';
import { currentReportOwner } from '@/features/auth/guestSession';
import { showToast } from '@/features/toast/toastStore';
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
import { OfflineError, transport } from './transport';
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

/** "Your flood report was sent to the barangay." Plain "Your report" for Other. */
function sentMessage(category: ReportCategory) {
  const kind = category === 'other' ? '' : `${CATEGORY_LABELS[category].toLowerCase()} `;
  return `Your ${kind}report was sent to the barangay.`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export interface SyncOptions {
  /** Try everything now, ignoring retry delays (e.g. signal just came back). */
  ignoreBackoff?: boolean;
}

let running: Promise<void> | null = null;
let pending: SyncOptions | null = null;

/**
 * Sends waiting reports, then their photos. Only one sync runs at a time; a request
 * made during a run is remembered and runs right after it.
 */
export function requestSync(options: SyncOptions = {}): Promise<void> {
  if (running) {
    pending = { ignoreBackoff: Boolean(pending?.ignoreBackoff || options.ignoreBackoff) };
    // Resolve after the queued run too, so callers see the result of their own request.
    return running.then(() => running ?? undefined);
  }
  running = syncOnce(options)
    .catch((error) => console.warn('Report sync failed', error))
    .finally(() => {
      running = null;
      if (pending) {
        const next = pending;
        pending = null;
        requestSync(next);
      }
    });
  return running;
}

async function syncOnce({ ignoreBackoff = false }: SyncOptions) {
  // Text reports first: they are small and let the barangay act even before photos arrive.
  // Only the signed-in account's (or the guest's) reports. Another account's wait until it signs back in.
  const owner = await currentReportOwner();
  const reports = (await dueReports(owner, Date.now(), ignoreBackoff)).sort(byPriority);
  let sentAny = false;
  for (const report of reports) {
    const id = report.submission.id;
    reportsStore.setSending(id, true);
    try {
      await transport.sendReport(report.submission);
      await markReportSent(id, new Date().toISOString());
      sentAny = true;
      if (report.attempts > 0) {
        // It waited for signal, so the resident may not be watching. First tries show on the sent screen.
        showToast({
          tone: 'success',
          icon: icons.sent,
          message: sentMessage(report.submission.category),
          action: {
            label: 'View',
            onPress: () => router.push({ pathname: '/reports/[id]', params: { id } }),
          },
        });
      }
    } catch (error) {
      const attempts = report.attempts + 1;
      await markReportRetry(id, attempts, Date.now() + retryDelay(attempts), errorMessage(error));
      if (error instanceof OfflineError) {
        return;
      }
    } finally {
      reportsStore.setSending(id, false);
      await reportsStore.refresh();
    }
  }

  const photos = (await duePhotos(owner, Date.now(), ignoreBackoff)).sort(byPriority);
  for (const report of photos) {
    if (!report.photo) {
      continue;
    }
    const id = report.submission.id;
    reportsStore.setSending(id, true);
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
      reportsStore.setSending(id, false);
      await reportsStore.refresh();
    }
  }

  // Pick up the barangay's status changes; right away when something new was just sent.
  await refreshStatuses({ force: sentAny });
}
