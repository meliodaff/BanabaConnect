import { useCallback, useEffect, useState, type SetStateAction } from 'react';
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
  | { status: 'denied'; coords: null }
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

/** Requests permission, reports the last known fix if recent, then a fresh one. */
async function findLocation(update: (action: SetStateAction<LocationState>) => void) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    update({ status: 'denied', coords: null });
    return;
  }

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

/** Gets the resident's position for a report. Call `retryLocation` after a denial or error. */
export function useReportLocation() {
  const [state, setState] = useState<LocationState>({ status: 'locating', coords: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    findLocation((action) => {
      if (active) {
        setState(action);
      }
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retryLocation = useCallback(() => {
    setState((prev) => ({ status: 'locating', coords: prev.coords }));
    setAttempt((n) => n + 1);
  }, []);

  return { location: state, retryLocation };
}
