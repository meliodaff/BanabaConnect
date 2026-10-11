import { REPORT_STATUS_LABELS } from '@banabaconnect/shared';
import { icons, type IconName } from '@/components/Icon';
import type { ThemeColors } from '@/theme';
import type { QueuedReport } from './types';

/**
 * How a report's status looks. Follows .claude/skills/anti-slop-status-colors: color shows
 * attention, not identity. Settled states are neutral (only the icon may carry a small
 * accent); "in motion" uses the primary color; only "not delivered yet" asks for attention.
 */
export interface DeliveryStatus {
  label: string;
  icon: IconName;
  iconColor: string;
  textColor: string;
  background: string;
  border: string;
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
  // Not delivered yet: the one state the resident must notice.
  const attention = (label: string): DeliveryStatus => ({
    label,
    icon: icons.queued,
    iconColor: colors.warning,
    textColor: colors.warning,
    background: colors.warningSoft,
    border: colors.warningBorder,
  });
  // Someone or something is working on it.
  const inMotion = (label: string, icon: IconName): DeliveryStatus => ({
    label,
    icon,
    iconColor: colors.primary,
    textColor: colors.primary,
    background: colors.primarySoft,
    border: colors.primarySoft,
  });
  // Settled: calm and neutral; the icon alone may carry a small accent.
  const settled = (label: string, icon: IconName, iconColor: string, muted = false): DeliveryStatus => ({
    label,
    icon,
    iconColor,
    textColor: muted ? colors.textMuted : colors.text,
    background: colors.background,
    border: colors.border,
  });

  if (sending) {
    return inMotion('Sending…', icons.sending);
  }
  if (report.syncStatus === 'sent') {
    switch (report.serverStatus) {
      case 'in_progress':
        return inMotion(REPORT_STATUS_LABELS.in_progress, icons.pending);
      case 'resolved':
        return settled(REPORT_STATUS_LABELS.resolved, icons.check, colors.success);
      case 'invalid':
        return settled(REPORT_STATUS_LABELS.invalid, icons.closed, colors.textMuted, true);
      case 'received':
        return settled(REPORT_STATUS_LABELS.received, icons.sent, colors.primary);
      default:
        return settled('Sent', icons.sent, colors.primary);
    }
  }
  return attention(isRetryingAfterError(report) ? 'Not sent yet' : 'Waiting for signal');
}

/** The sentence under the status on the report details screen. */
export function deliveryStatusDetail(report: QueuedReport): string {
  if (report.syncStatus !== 'sent') {
    return isRetryingAfterError(report)
      ? "Saved on your phone. The barangay's system didn't accept it yet, so the app keeps trying."
      : 'Saved on your phone. Sends automatically when you get signal.';
  }
  const updated = report.serverStatusAt ? ` Updated ${formatReportTime(report.serverStatusAt)}.` : '';
  const seeNote = report.serverNote ? ' See the note from barangay staff below.' : '';
  switch (report.serverStatus) {
    case 'in_progress':
      return `The barangay is responding to your report.${updated}${seeNote}`;
    case 'resolved':
      return `The barangay marked this incident as resolved.${updated}${seeNote}`;
    case 'invalid':
      return report.serverNote
        ? `The barangay closed this report. Their reason is below.${updated}`
        : `The barangay closed this report.${updated}`;
    default:
      return `Sent to the barangay on ${formatReportTime(report.sentAt ?? report.submission.createdAt)}.${seeNote}`;
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
