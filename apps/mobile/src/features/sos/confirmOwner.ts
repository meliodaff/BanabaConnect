import * as LocalAuthentication from 'expo-local-authentication';

/**
 * - `confirmed`: the phone's own lock (fingerprint, face, PIN, pattern or password) was passed.
 * - `cancelled`: the person backed out or failed; nothing is sent.
 * - `noLock`: the phone has no screen lock at all, so the app asks for a long press instead.
 */
export type OwnerCheck = 'confirmed' | 'cancelled' | 'noLock';

/** Whether this phone has any screen lock the app can ask for. */
export async function hasScreenLock(): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

/**
 * Asks for the phone's own lock before an SOS is sent, so a child playing with a parent's phone
 * can't send one by accident. The device passcode stays allowed, so a wet or injured finger never
 * blocks a real emergency. It confirms whoever knows the lock, not a specific person.
 */
export async function confirmPhoneOwner(): Promise<OwnerCheck> {
  if (!(await hasScreenLock())) {
    return 'noLock';
  }
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirm to send SOS to Barangay Banaba',
    cancelLabel: 'Cancel',
    // Device passcode fallback stays on (the default).
    disableDeviceFallback: false,
  });
  if (result.success) {
    return 'confirmed';
  }
  // The lock was removed between the check and the prompt.
  return result.error === 'not_enrolled' || result.error === 'passcode_not_set' ? 'noLock' : 'cancelled';
}
