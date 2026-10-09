import { useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';
import { loadPreference, savePreference } from './preferenceStorage';

/** "system" follows the phone's light/dark setting. */
export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'themePreference';

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function readSaved(): ThemePreference {
  try {
    const saved = loadPreference(STORAGE_KEY);
    return isThemePreference(saved) ? saved : 'system';
  } catch (error) {
    console.warn('Could not read theme preference', error);
    return 'system';
  }
}

/** Makes the keyboard, alerts, and other system UI match the app. */
function applyToSystemUi(preference: ThemePreference) {
  if (Platform.OS !== 'web') {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }
}

let preference = readSaved();
applyToSystemUi(preference);
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return preference;
}

export function setThemePreference(next: ThemePreference) {
  preference = next;
  applyToSystemUi(next);
  try {
    savePreference(STORAGE_KEY, next);
  } catch (error) {
    // The choice still applies until the app closes.
    console.warn('Could not save theme preference', error);
  }
  listeners.forEach((listener) => listener());
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getSnapshot);
}
