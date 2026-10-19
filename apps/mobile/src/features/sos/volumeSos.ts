import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { VolumeSos } from '../../../modules/volume-sos';

export { VolumeSos };

/**
 * Whether volume-button SOS is on (Android). `null` where it doesn't exist (iPhone, web, older
 * builds). Checked again whenever the app comes back, since it is turned on in the phone's
 * Settings.
 */
export function useVolumeSosEnabled(): boolean | null {
  const [enabled, setEnabled] = useState(() => VolumeSos?.isEnabled() ?? null);
  useEffect(() => {
    const volumeSos = VolumeSos;
    if (!volumeSos) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setEnabled(volumeSos.isEnabled());
    });
    return () => subscription.remove();
  }, []);
  return enabled;
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
