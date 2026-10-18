import NetInfo from '@react-native-community/netinfo';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import type { ReportSubmission } from '@banabaconnect/shared';
import { ensureSession } from '@/features/auth/guestSession';
import { supabase, supabaseConfigured } from '@/features/auth/supabase';
import { reportPayload } from './reportPayload';

export interface PhotoToUpload {
  uri: string;
  width: number;
  height: number;
}

/** How reports and photos leave the phone. The sync engine retries on any thrown error. */
export interface ReportTransport {
  sendReport(submission: ReportSubmission): Promise<void>;
  uploadPhoto(reportId: string, photo: PhotoToUpload): Promise<void>;
}

/** Thrown when there is no connection at all, so the engine stops trying the rest for now. */
export class OfflineError extends Error {
  constructor() {
    super('No connection');
  }
}

/** Any connection counts, even a weak one: worth a try. */
export async function hasConnection() {
  return (await NetInfo.fetch()).isConnected !== false;
}

async function requireConnection() {
  if (!(await hasConnection())) {
    throw new OfflineError();
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Storage answers 409 when the file is already there, e.g. an earlier upload worked but attaching it didn't. */
function isAlreadyUploaded(error: { message: string; statusCode?: string | number }) {
  return String(error.statusCode) === '409' || /already exists/i.test(error.message);
}

async function readPhoto(uri: string): Promise<ArrayBuffer | Uint8Array> {
  return Platform.OS === 'web' ? (await fetch(uri)).arrayBuffer() : new File(uri).bytes();
}

/**
 * Sends reports to the `submit_report` database function, which picks the reporter from the
 * session and computes the priority score. Photos go to the private report-photos bucket.
 */
export const supabaseTransport: ReportTransport = {
  async sendReport(submission) {
    await requireConnection();
    await ensureSession();
    const { error } = await supabase.rpc('submit_report', reportPayload(submission));
    if (error) {
      throw new Error(`Report not accepted: ${error.message}`);
    }
  },

  async uploadPhoto(reportId, photo) {
    await requireConnection();
    const session = await ensureSession();
    const path = `${session.user.id}/${reportId}.jpg`;

    const upload = await supabase.storage
      .from('report-photos')
      .upload(path, await readPhoto(photo.uri), { contentType: 'image/jpeg' });
    if (upload.error && !isAlreadyUploaded(upload.error)) {
      throw new Error(`Photo upload failed: ${upload.error.message}`);
    }

    const { error } = await supabase.rpc('attach_report_photo', {
      p_report_id: reportId,
      p_width: Math.round(photo.width),
      p_height: Math.round(photo.height),
    });
    if (error) {
      throw new Error(`Photo not attached: ${error.message}`);
    }
  },
};

/**
 * Used when the build has no Supabase keys. It "delivers" only when the phone is actually
 * connected, so queueing and retries still behave realistically in airplane mode.
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

export const transport: ReportTransport = supabaseConfigured
  ? supabaseTransport
  : simulatedTransport;
