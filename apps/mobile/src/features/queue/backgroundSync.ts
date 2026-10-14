import { Platform } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { currentReportOwner } from '@/features/auth/guestSession';
import { supabaseConfigured } from '@/features/auth/supabase';
import { listReports } from './reportRepository';
import { requestSync } from './syncEngine';

export const REPORT_SYNC_TASK = 'banabaconnect.report-sync';

// Defined at bundle load, rather than in a hook: background launches have no mounted UI.
if (!TaskManager.isTaskDefined(REPORT_SYNC_TASK)) {
  TaskManager.defineTask(REPORT_SYNC_TASK, async ({ error }) => {
    if (error) {
      console.warn('Background report task failed', error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
    // Never use the development-only simulated transport for unattended delivery.
    if (!supabaseConfigured) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    let expired = false;
    let expiration: { remove: () => void } | null = null;
    try {
      if (Platform.OS === 'ios') {
        expiration = BackgroundTask.addExpirationListener(() => { expired = true; });
      }
      await requestSync({
        ignoreBackoff: true,
        background: true,
        shouldContinue: () => !expired,
      });
      const reports = await listReports(await currentReportOwner());
      const waiting = reports.some((report) =>
        report.syncStatus === 'queued' || report.photo?.syncStatus === 'queued',
      );
      // The sync engine persists retries instead of throwing on transport errors.
      return expired || waiting
        ? BackgroundTask.BackgroundTaskResult.Failed
        : BackgroundTask.BackgroundTaskResult.Success;
    } catch (syncError) {
      console.warn('Could not sync reports in the background', syncError);
      return BackgroundTask.BackgroundTaskResult.Failed;
    } finally {
      expiration?.remove();
    }
  });
}

/** Register once per installation; retry on foreground if previously unavailable. */
export async function registerBackgroundSync(): Promise<void> {
  if (!supabaseConfigured || !(await TaskManager.isAvailableAsync())) {
    return;
  }
  if (await BackgroundTask.getStatusAsync() !== BackgroundTask.BackgroundTaskStatus.Available) {
    return;
  }
  // Minutes, not seconds. The OS chooses the actual execution time, especially on iOS.
  await BackgroundTask.registerTaskAsync(REPORT_SYNC_TASK, { minimumInterval: 15 });
}
