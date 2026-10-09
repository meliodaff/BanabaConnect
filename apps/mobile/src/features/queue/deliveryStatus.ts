import { icons, type IconName } from '@/components/Icon';
import { colors } from '@/theme';
import type { QueuedReport } from './types';

export interface DeliveryStatus {
  label: string;
  icon: IconName;
  color: string;
  background: string;
}

/** Where a saved report is: sending, sent, or waiting for signal. */
export function deliveryStatusOf(report: QueuedReport, sending: boolean): DeliveryStatus {
  if (sending) {
    return {
      label: 'Sending…',
      icon: icons.sending,
      color: colors.primary,
      background: colors.primarySoft,
    };
  }
  if (report.syncStatus === 'sent') {
    return {
      label: 'Sent',
      icon: icons.sent,
      color: colors.success,
      background: colors.successSoft,
    };
  }
  return {
    label: 'Waiting for signal',
    icon: icons.queued,
    color: colors.warning,
    background: colors.warningSoft,
  };
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
