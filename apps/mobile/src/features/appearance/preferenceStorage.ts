import { Storage } from 'expo-sqlite/kv-store';

/** Small settings saved on the phone. Synchronous so the first frame uses the right theme. */
export function loadPreference(key: string): string | null {
  return Storage.getItemSync(key);
}

export function savePreference(key: string, value: string) {
  Storage.setItemSync(key, value);
}
