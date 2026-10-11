import { REPORT_STATUS_LABELS } from '@banabaconnect/shared';
import { icons, type IconName } from '@/components/Icon';
import type { ThemeColors } from '@/theme';
import type { QueuedReport } from './types';

export interface DeliveryStatus {
  label: string;
  icon: IconName;
  color: string;
  background: string;
}

const OFFLINE_ERROR_MESSAGE = 'No connection';

/** Not sent yet, and the last try reached the server but wasn't accepted (not just no signal). */
export function isRetryingAfterError(report: QueuedReport) {
  return (
    report.syncStatus === 'queued' &&
    report.lastError !== null &&
    report.lastError !== OFFLINE_ERROR_MESSAGE
  );
}

/**
 * Where a report is: waiting on the phone, sending, sent, or what the barangay did with it.
 */
export function deliveryStatusOf(
  report: QueuedReport,
  sending: boolean,
  colors: ThemeColors,
): DeliveryStatus {
  if (sending) {
    return {
      label: 'Sending…',
      icon: icons.sending,
      color: colors.primary,
      background: colors.primarySoft,
    };
  }
  if (report.syncStatus === 'sent') {
    switch (report.serverStatus) {
      case 'in_progress':
        return {
          label: REPORT_STATUS_LABELS.in_progress,
          icon: icons.pending,
          color: colors.warning,
          background: colors.warningSoft,
        };
      case 'resolved':
        return {
          label: REPORT_STATUS_LABELS.resolved,
          icon: icons.check,
          color: colors.success,
          background: colors.successSoft,
        };
      case 'invalid':
        return {
          label: REPORT_STATUS_LABELS.invalid,
          icon: icons.info,
          color: colors.textMuted,
          background: colors.highlightSoft,
        };
      case 'received':
        return {
          label: REPORT_STATUS_LABELS.received,
          icon: icons.sent,
          color: colors.success,
          background: colors.successSoft,
        };
      default:
        return {
          label: 'Sent',
          icon: icons.sent,
          color: colors.success,
          background: colors.successSoft,
        };
    }
  }
  if (isRetryingAfterError(report)) {
    return {
      label: 'Not sent yet',
      icon: icons.queued,
      color: colors.warning,
      background: colors.warningSoft,
    };
  }
  return {
    label: 'Waiting for signal',
    icon: icons.queued,
    color: colors.warning,
    background: colors.warningSoft,
  };
}

/** The sentence under the status on the report details screen. */
export function deliveryStatusDetail(report: QueuedReport): string {
  if (report.syncStatus !== 'sent') {
    return isRetryingAfterError(report)
      ? "Saved on your phone. The barangay's system didn't accept it yet, so the app keeps trying."
      : 'Saved on your phone. Sends automatically when you get signal.';
  }
  const updated = report.serverStatusAt ? ` Updated ${formatReportTime(report.serverStatusAt)}.` : '';
  switch (report.serverStatus) {
    case 'in_progress':
      return `The barangay is responding to your report.${updated}`;
    case 'resolved':
      return `The barangay marked this incident as resolved.${updated}`;
    case 'invalid':
      return `The barangay closed this report.${updated}`;
    default:
      return `Sent to the barangay on ${formatReportTime(report.sentAt ?? report.submission.createdAt)}.`;
  }
}

/** A sent report whose photo has not reached the server yet. */
export function isPhotoWaiting(report: QueuedReport) {
  return report.syncStatus === 'sent' && report.photo?.syncStatus === 'queued';
}

export function formatReportTime(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
