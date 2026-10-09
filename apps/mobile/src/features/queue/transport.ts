import NetInfo from '@react-native-community/netinfo';
import type { ReportSubmission } from '@banabaconnect/shared';

/** How reports and photos leave the phone. The sync engine retries on any thrown error. */
export interface ReportTransport {
  sendReport(submission: ReportSubmission): Promise<void>;
  uploadPhoto(reportId: string, uri: string): Promise<void>;
}

/** Thrown when there is no connection at all, so the engine stops trying the rest for now. */
export class OfflineError extends Error {
  constructor() {
    super('No connection');
  }
}

async function requireConnection() {
  const state = await NetInfo.fetch();
  // Any connection counts, even a weak one: worth a try.
  if (state.isConnected === false) {
    throw new OfflineError();
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Stand-in until the Next.js API exists. It "delivers" only when the phone is actually
 * connected, so queueing and retries behave realistically in airplane mode.
 * TODO: replace with POST /api/reports and signed-URL photo uploads to Supabase Storage.
 */
export const simulatedTransport: ReportTransport = {
  async sendReport() {
    await requireConnection();
    await delay(800);
  },
  async uploadPhoto() {
    await requireConnection();
    await delay(1500);
  },
};

export const transport: ReportTransport = simulatedTransport;
