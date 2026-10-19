import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { VolumeSos } from '../../../modules/volume-sos';

export { VolumeSos };

/**
 * - `off`: not turned on in Settings.
 * - `stopped`: turned on, but not running (for example after Stop in the phone's Active apps
 *   list), and Android doesn't start it again by itself.
 * - `on`: running.
 */
export type VolumeSosState = 'off' | 'stopped' | 'on';

function readState(volumeSos: NonNullable<typeof VolumeSos>): VolumeSosState {
  if (!volumeSos.isEnabled()) return 'off';
  // Builds without the check can't tell, so trust Settings.
  return (volumeSos.isRunning?.() ?? true) ? 'on' : 'stopped';
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

/**
 * Whether battery saving leaves BanabaConnect alone (Android), so the phone doesn't stop
 * volume-button SOS after the app is swiped away. `null` where it can't be checked. Checked again
 * whenever the app comes back, since it is changed in the phone's Settings.
 */
export function useVolumeSosBatteryExempt(): boolean | null {
  const [exempt, setExempt] = useState(() => VolumeSos?.isIgnoringBatteryOptimizations?.() ?? null);
  useEffect(() => {
    const check = VolumeSos?.isIgnoringBatteryOptimizations;
    if (!check) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setExempt(check());
    });
    return () => subscription.remove();
  }, []);
  return exempt;
}
