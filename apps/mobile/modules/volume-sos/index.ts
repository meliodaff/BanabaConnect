import { requireOptionalNativeModule } from 'expo';

interface VolumeSosNative {
  isEnabled(): boolean;
  openSettings(): void;
  /** Missing in builds made before the ongoing notification was added. */
  isIgnoringBatteryOptimizations?(): boolean;
  openBatterySettings?(): void;
}

/**
 * Android only (see android/…/VolumeSosService.kt): `null` on iPhone and web, which don't let
 * apps watch the volume buttons, and in builds made before this module was added.
 */
export const VolumeSos = requireOptionalNativeModule<VolumeSosNative>('VolumeSos');
