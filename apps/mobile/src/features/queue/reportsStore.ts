import { useSyncExternalStore } from 'react';
import { currentReportOwner } from '@/features/auth/guestSession';
import { listReports } from './reportRepository';
import type { QueuedReport } from './types';

export interface ReportsState {
  loaded: boolean;
  reports: QueuedReport[];
  /** Reports or photos currently being sent. */
  sendingIds: ReadonlySet<string>;
}

let state: ReportsState = { loaded: false, reports: [], sendingIds: new Set() };
const listeners = new Set<() => void>();

function setState(next: ReportsState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

export const reportsStore = {
  getState: getSnapshot,
  /** Reloads the signed-in account's (or the guest's) reports from the local database. */
  async refresh() {
    const reports = await listReports(await currentReportOwner());
    setState({ ...state, loaded: true, reports });
  },
  setSending(id: string, sending: boolean) {
    const sendingIds = new Set(state.sendingIds);
    if (sending) {
      sendingIds.add(id);
    } else {
      sendingIds.delete(id);
    }
    setState({ ...state, sendingIds });
  },
};

/** The reports saved on this phone, kept up to date as the queue syncs. */
export function useQueuedReports(): ReportsState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Reports not yet accepted by the server. */
export function countWaiting(reports: QueuedReport[]) {
  return reports.filter((r) => r.syncStatus === 'queued').length;
}
