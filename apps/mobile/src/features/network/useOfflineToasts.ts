import { useEffect, useRef } from 'react';
import { icons } from '@/components/Icon';
import { BACK_ONLINE_TOAST_MESSAGE, OFFLINE_TOAST_MESSAGE } from '@/features/report/messages';
import { showToast } from '@/features/toast/toastStore';
import { useIsOffline } from './useIsOffline';

/** Long enough to read the whole offline message in a hurry. */
const OFFLINE_TOAST_MS = 8000;

/**
 * Shows a toast when the phone loses signal and when it comes back. Mount once, in the
 * root layout, so the message appears once per change instead of on every screen.
 */
export function useOfflineToasts() {
  const offline = useIsOffline();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (offline && !wasOffline.current) {
      showToast({
        tone: 'warning',
        icon: icons.offline,
        message: OFFLINE_TOAST_MESSAGE,
        duration: OFFLINE_TOAST_MS,
      });
    } else if (!offline && wasOffline.current) {
      showToast({ tone: 'success', icon: icons.online, message: BACK_ONLINE_TOAST_MESSAGE });
    }
    wasOffline.current = offline;
  }, [offline]);
}
