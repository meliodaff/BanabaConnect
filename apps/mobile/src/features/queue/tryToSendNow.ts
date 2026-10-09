import {
  COULD_NOT_SEND_TOAST_MESSAGE,
  STILL_NO_SIGNAL_TOAST_MESSAGE,
} from '@/features/report/messages';
import { currentToastId, hideToast, showToast } from '@/features/toast/toastStore';
import { countWaiting, reportsStore } from './reportsStore';
import { requestSync } from './syncEngine';

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
    message: several ? 'Sending your reports…' : 'Sending your report…',
  });

  await requestSync({ ignoreBackoff: true });

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
        ? 'Your reports were sent to the barangay.'
        : 'Your report was sent to the barangay.',
    });
  } else {
    hideToast(loadingId);
  }
}
