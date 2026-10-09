/** Small settings saved in the browser. */
export function loadPreference(key: string): string | null {
  return globalThis.localStorage?.getItem(key) ?? null;
}

export function savePreference(key: string, value: string) {
  globalThis.localStorage?.setItem(key, value);
}
