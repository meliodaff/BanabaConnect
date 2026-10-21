import { useSyncExternalStore } from 'react';
import type { View } from 'react-native';

/**
 * The interactive tutorial's state: which step is showing, and the parts of the real screens it
 * can point at. Kept in memory only, so closing the app ends the tutorial.
 */

let step: number | null = null;
const stepListeners = new Set<() => void>();

function setStep(next: number | null) {
  step = next;
  stepListeners.forEach((listener) => listener());
}

export function startTutorial() {
  setStep(0);
}

export function goToStep(next: number) {
  setStep(next);
}

export function endTutorial() {
  setStep(null);
}

function subscribeStep(listener: () => void) {
  stepListeners.add(listener);
  return () => {
    stepListeners.delete(listener);
  };
}

/** The current step's index, or null when the tutorial isn't running. */
export function useTutorialStep() {
  return useSyncExternalStore(subscribeStep, () => step);
}

// Parts of the screens the tutorial points at, registered by TourTarget.

const targets = new Map<string, View>();

export function registerTarget(id: string, view: View) {
  targets.set(id, view);
}

export function unregisterTarget(id: string, view: View) {
  if (targets.get(id) === view) {
    targets.delete(id);
  }
}

/** The first of these targets that is on a mounted screen. */
export function findTarget(ids: readonly string[]) {
  for (const id of ids) {
    const view = targets.get(id);
    if (view) return view;
  }
  return null;
}

// Taps on a target, for steps that ask the resident to tap the real button.

const tapListeners = new Set<(id: string) => void>();

export function reportTap(id: string) {
  tapListeners.forEach((listener) => listener(id));
}

export function onTargetTap(listener: (id: string) => void) {
  tapListeners.add(listener);
  return () => {
    tapListeners.delete(listener);
  };
}

// Scrolling screens, so the tutorial can bring a target into view.

export interface Scroller {
  /** Scrolls the screen's content by this many points (positive is down). */
  scrollBy: (dy: number, animated: boolean) => void;
}

const scrollers = new Map<string, Scroller>();

/** `route` is the screen's path, like "/" or "/profile". */
export function registerScroller(route: string, scroller: Scroller) {
  scrollers.set(route, scroller);
  return () => {
    if (scrollers.get(route) === scroller) {
      scrollers.delete(route);
    }
  };
}

export function getScroller(route: string) {
  return scrollers.get(route) ?? null;
}
