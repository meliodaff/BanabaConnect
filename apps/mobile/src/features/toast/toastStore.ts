import { useSyncExternalStore } from 'react';
import type { IconName } from '@/components/Icon';

/**
 * Same meanings as the palette: success = sent, warning = waiting for signal, error = must fix.
 * loading shows a spinner; replace it with the result when the work finishes.
 */
export type ToastTone = 'info' | 'success' | 'warning' | 'error' | 'loading';

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
  /** Defaults to an icon that matches the tone. */
  icon?: IconName;
  /** One short action, like "Undo" or "View". Tapping it also closes the toast. */
  action?: { label: string; onPress: () => void };
  /** How long it stays, in ms. Defaults to a few seconds, a little longer with an action. */
  duration?: number;
}

export interface Toast extends ToastOptions {
  id: number;
}

let current: Toast | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function setCurrent(next: Toast | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return current;
}

/**
 * Shows a short message at the top of the screen. A new toast replaces the one showing.
 * Returns the toast's id, for hiding it later.
 */
export function showToast(options: ToastOptions): number {
  const id = nextId++;
  setCurrent({ ...options, id });
  return id;
}

/** The id of the toast on screen, if any. */
export function currentToastId(): number | null {
  return current?.id ?? null;
}

/** Removes the toast, unless a newer one has already replaced it. */
export function hideToast(id: number) {
  if (current?.id === id) {
    setCurrent(null);
  }
}

export function useCurrentToast(): Toast | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}
