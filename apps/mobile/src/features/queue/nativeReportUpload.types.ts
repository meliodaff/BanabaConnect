import type { QueuedReport } from './types';

export interface NativeReportHandlers {
  onSent: () => Promise<void>;
  onFailed: (error: unknown) => Promise<void>;
}

/** True means handed to the OS (or already in flight), not accepted by the server. */
export type NativeReportEnqueue = (report: QueuedReport, handlers: NativeReportHandlers) => Promise<boolean>;
