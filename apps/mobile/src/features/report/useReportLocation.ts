import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

export interface ReportCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export type LocationState =
  | { status: 'locating'; coords: ReportCoords | null }
  | { status: 'ready'; coords: ReportCoords }
  /** An older fix used because a fresh one could not be found in time. */
  | { status: 'approximate'; coords: ReportCoords }
  /** Permission refused. When `canAskAgain` is false, only the Settings app can grant it. */
  | { status: 'denied'; coords: null; canAskAgain: boolean }
  /** The phone's location setting (GPS) is switched off. */
  | { status: 'servicesOff'; coords: null }
  | { status: 'error'; coords: ReportCoords | null };

// A fix this recent and this precise is good enough to show right away while
// a fresh one is requested. GPS itself works without mobile data.
const LAST_KNOWN_MAX_AGE_MS = 2 * 60 * 1000;
const LAST_KNOWN_REQUIRED_ACCURACY_M = 100;
// How long to wait for a fresh GPS fix before falling back or offering a retry.
const CURRENT_POSITION_TIMEOUT_MS = 20 * 1000;
// Oldest fix accepted as a fallback when a fresh one can't be found.
const FALLBACK_MAX_AGE_MS = 30 * 60 * 1000;

function toCoords(location: Location.LocationObject): ReportCoords {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
  };
}

/**
 * Checks permission and the phone's location setting, then finds a position.
 * `interactive` attempts may show system dialogs; silent ones (e.g. after returning
 * from Settings) only check, so a declined dialog can never pop up again in a loop.
 */
async function findLocation(
  update: (action: SetStateAction<LocationState>) => void,
  interactive: boolean,
) {
  let permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted && permission.canAskAgain && interactive) {
    permission = await Location.requestForegroundPermissionsAsync();
  }
  if (!permission.granted) {
    update({ status: 'denied', coords: null, canAskAgain: permission.canAskAgain });
    return;
  }

  if (!(await Location.hasServicesEnabledAsync())) {
    const turnedOn =
      interactive && Platform.OS === 'android'
        ? await Location.enableNetworkProviderAsync().then(
            () => true,
            () => false,
          )
        : false;
    if (!turnedOn) {
      update({ status: 'servicesOff', coords: null });
      return;
    }
  }

  update((prev) => ({ status: 'locating', coords: prev.coords }));

  try {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
      requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_M,
    });
    if (lastKnown) {
      update({ status: 'locating', coords: toCoords(lastKnown) });
    }

    const current = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      CURRENT_POSITION_TIMEOUT_MS,
    );
    update({ status: 'ready', coords: toCoords(current) });
  } catch {
    // No fresh fix in time (e.g. indoors). Fall back to an older fix rather than block the report.
    const fallback = await Location.getLastKnownPositionAsync({
      maxAge: FALLBACK_MAX_AGE_MS,
    }).catch(() => null);
    update((prev) => {
      if (prev.coords) return { status: 'ready', coords: prev.coords };
      if (fallback) return { status: 'approximate', coords: toCoords(fallback) };
      return { status: 'error', coords: null };
    });
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Gets the resident's position for a report.
 * `retryLocation` asks again (or opens Settings when Android no longer shows the dialog),
 * and the position is rechecked automatically when the resident comes back to the app.
 */
export function useReportLocation() {
  const [state, setState] = useState<LocationState>({ status: 'locating', coords: null });
  const [attempt, setAttempt] = useState({ count: 0, interactive: true });
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let active = true;
    findLocation((action) => {
      if (active) {
        setState(action);
      }
    }, attempt.interactive);
    return () => {
      active = false;
    };
  }, [attempt]);

  // Coming back from Settings (or the notification shade) may have fixed the problem.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const { status } = stateRef.current;
      if (next === 'active' && (status === 'denied' || status === 'servicesOff')) {
        setAttempt((prev) => ({ count: prev.count + 1, interactive: false }));
      }
    });
    return () => subscription.remove();
  }, []);

  const retryLocation = useCallback(() => {
    const current = stateRef.current;
    if (current.status === 'denied' && !current.canAskAgain) {
      Linking.openSettings();
      return;
    }
    if (current.status === 'servicesOff' && Platform.OS === 'ios') {
      Linking.openSettings();
      return;
    }
    setState((prev) => ({ status: 'locating', coords: prev.coords }));
    setAttempt((prev) => ({ count: prev.count + 1, interactive: true }));
  }, []);

  return { location: state, retryLocation };
}
