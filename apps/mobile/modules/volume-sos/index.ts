import { requireOptionalNativeModule } from 'expo';

interface VolumeSosNative {
  isEnabled(): boolean;
  isRunning(): boolean;
  keepReady(): void;
  openSettings(): void;
  hasAutostart(): boolean;
  openBackgroundSettings(): void;
}

/**
 * Android only (see android/…/VolumeSosService.kt): `null` on iPhone and web, which don't let
 * apps watch the volume buttons, and in builds made before this module was added.
 */
export const VolumeSos = requireOptionalNativeModule<VolumeSosNative>('VolumeSos');
