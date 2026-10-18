import {
  COULD_NOT_SEND_TOAST_MESSAGE,
  STILL_NO_SIGNAL_TOAST_MESSAGE,
} from '@/features/report/messages';
import { currentToastId, hideToast, showToast } from '@/features/toast/toastStore';
import { countWaiting, reportsStore } from './reportsStore';
import { requestSync } from './syncEngine';

// How long to wait for uploads iOS is still finishing before saying it didn't work.
const IN_FLIGHT_WAIT_MS = 30_000;

/** Waiting reports whose upload is still running (iOS finishes them after the queue pass). */
function hasUploadsInFlight() {
  const { reports, sendingIds } = reportsStore.getState();
  return reports.some((r) => r.syncStatus === 'queued' && sendingIds.has(r.submission.id));
}

function waitForUploadsInFlight() {
  return new Promise<void>((resolve) => {
    if (!hasUploadsInFlight()) {
      resolve();
      return;
    }
    const done = () => {
      clearTimeout(timer);
      unsubscribe();
      resolve();
    };
    const timer = setTimeout(done, IN_FLIGHT_WAIT_MS);
    const unsubscribe = reportsStore.subscribe(() => {
      if (!hasUploadsInFlight()) done();
    });
  });
}

/**
 * The "Try now" button: send waiting reports right away and show how it went,
 * or say why that can't happen yet.
 */
export async function tryToSendNow(offline: boolean) {
  if (offline) {
    showToast({ tone: 'warning', message: STILL_NO_SIGNAL_TOAST_MESSAGE });
    return;
  }

  const waitingBefore = countWaiting(reportsStore.getState().reports);
  const several = waitingBefore > 1;
  const loadingId = showToast({
    tone: 'loading',
    message: several ? 'Ipinapadala ang mga report mo…' : 'Ipinapadala ang report mo…',
  });

  await requestSync({ ignoreBackoff: true });
  await waitForUploadsInFlight();

  // The sync shows its own "sent" toast per report; if one replaced the spinner, it's done.
  if (currentToastId() !== loadingId) {
    return;
  }
  if (countWaiting(reportsStore.getState().reports) > 0) {
    showToast({ tone: 'warning', message: COULD_NOT_SEND_TOAST_MESSAGE });
  } else if (waitingBefore > 0) {
    showToast({
      tone: 'success',
      message: several
        ? 'Naipadala na sa barangay ang mga report mo.'
        : 'Naipadala na sa barangay ang report mo.',
    });
  } else {
    hideToast(loadingId);
  }
}
