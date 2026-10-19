import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { VolumeSos } from '../../../modules/volume-sos';

export { VolumeSos };

/**
 * - `off`: not turned on in Settings, then Accessibility.
 * - `stopped`: turned on, but the phone stopped it (usually after the app was swiped away from
 *   recent apps) and Android hasn't started it again.
 * - `on`: running.
 */
export type VolumeSosState = 'off' | 'stopped' | 'on';

function readState(volumeSos: NonNullable<typeof VolumeSos>): VolumeSosState {
  if (!volumeSos.isEnabled()) return 'off';
  return volumeSos.isRunning() ? 'on' : 'stopped';
}

/**
 * Shows the silent "Volume-button SOS is ready" notification whenever the app comes to the front,
 * if the feature is on. Android doesn't let the service start it from the background, and the
 * notification is what keeps phones like Xiaomi from stopping the service when the app is swiped
 * away. Used in the root layout, so it runs whichever screen opens.
 */
export function useKeepVolumeSosReady() {
  useEffect(() => {
    const volumeSos = VolumeSos;
    if (!volumeSos) return;
    volumeSos.keepReady();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') volumeSos.keepReady();
    });
    return () => subscription.remove();
  }, []);
}

/**
 * Whether volume-button SOS is working (Android). `null` where it doesn't exist (iPhone, web,
 * older builds). Checked again whenever the app comes back, since it is turned on in the phone's
 * Settings.
 */
export function useVolumeSosState(): VolumeSosState | null {
  const [state, setState] = useState(() => (VolumeSos ? readState(VolumeSos) : null));
  useEffect(() => {
    const volumeSos = VolumeSos;
    if (!volumeSos) return;
    let recheck: ReturnType<typeof setTimeout> | undefined;
    function check() {
      clearTimeout(recheck);
      const next = readState(volumeSos!);
      setState(next);
      // Just turned on in Settings, Android takes a moment to start it; don't call that stopped.
      if (next === 'stopped') recheck = setTimeout(() => setState(readState(volumeSos!)), 2000);
    }
    check();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => {
      clearTimeout(recheck);
      subscription.remove();
    };
  }, []);
  return state;
}
