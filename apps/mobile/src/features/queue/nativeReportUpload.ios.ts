import { Directory, File, Paths, UploadType, type UploadTask } from 'expo-file-system';
import { supabase, supabaseConfigured } from '@/features/auth/supabase';
import type { NativeReportEnqueue } from './nativeReportUpload.types';
import { reportPayload } from './reportPayload';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Keep native handles alive until completion: releasing a handle cancels its upload.
// null reserves an id while the saved session and body file are being prepared.
const uploads = new Map<string, UploadTask | null>();

export const enqueueNativeReport: NativeReportEnqueue = async (report, handlers) => {
  if (!supabaseConfigured || !url || !key) return false;
  const id = report.submission.id;
  if (uploads.has(id)) return true;
  uploads.set(id, null);

  let bodyFile: File | null = null;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      uploads.delete(id);
      // A fresh guest needs an online sign-in before a request can be authenticated.
      return false;
    }
    const owner = session.user.is_anonymous ? null : session.user.id;
    if (owner !== report.ownerId) {
      throw new Error('The report belongs to another account');
    }

    const directory = new Directory(Paths.document, 'report-requests');
    directory.create({ intermediates: true, idempotent: true });
    bodyFile = new File(directory, `${id}.json`);
    bodyFile.create({ overwrite: true });
    bodyFile.write(JSON.stringify(reportPayload(report.submission)));

    const task = bodyFile.createUploadTask(`${url.replace(/\/$/, '')}/rest/v1/rpc/submit_report`, {
      httpMethod: 'POST',
      uploadType: UploadType.BINARY_CONTENT,
      sessionType: 'background',
      headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    });
    uploads.set(id, task);

    // Start while the app is awake, even offline. iOS owns the transfer after suspension.
    // Don't await the network here: other saved reports must also reach the native queue.
    const file = bodyFile;
    void task.uploadAsync()
      .then(async (response) => {
        if (response.status < 200 || response.status >= 300) {
          // The status lets the queue tell an expired session (401) from other rejections.
          throw Object.assign(new Error(`Report not accepted (HTTP ${response.status})`), { status: response.status });
        }
        await handlers.onSent();
      })
      .catch((uploadError: unknown) => handlers.onFailed(uploadError))
      .finally(() => {
        uploads.delete(id);
        task.release();
        // The report remains in SQLite; only this request's temporary body is removed.
        try { if (file.exists) file.delete(); } catch { /* Retry can replace it later. */ }
      })
      .catch((saveError: unknown) => console.warn('Could not record native report delivery', saveError));
    return true;
  } catch (error) {
    uploads.delete(id);
    try { if (bodyFile?.exists) bodyFile.delete(); } catch { /* SQLite still owns the report. */ }
    throw error;
  }
};
