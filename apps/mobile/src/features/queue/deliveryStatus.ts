import { REPORT_STATUS_LABELS } from '@banabaconnect/shared';
import { icons, type IconName } from '@/components/Icon';
import type { ThemeColors } from '@/theme';
import type { QueuedReport } from './types';

/**
 * How a report's status looks. Each stage has its own color so residents can scan My Reports at
 * a glance (the project owner chose this over the all-neutral pills in
 * .claude/skills/anti-slop-status-colors). Every pill still has an icon and a label, so color is
 * never the only signal, and red stays reserved for emergencies:
 * amber = waiting on the phone, blue = sending or received, violet = in progress,
 * green = resolved, gray = closed.
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
  // Text and icon in the stage's color, on a soft tint of it, with a matching border.
  const pill = (
    label: string,
    icon: IconName,
    color: string,
    background: string,
    border: string,
  ): DeliveryStatus => ({ label, icon, iconColor: color, textColor: color, background, border });

  const blue = (label: string, icon: IconName) =>
    pill(label, icon, colors.primary, colors.primarySoft, colors.border);

  if (sending) {
    return blue('Sending…', icons.sending);
  }
  if (report.syncStatus === 'sent') {
    switch (report.serverStatus) {
      case 'in_progress':
        return pill(
          REPORT_STATUS_LABELS.in_progress,
          icons.pending,
          colors.progress,
          colors.progressSoft,
          colors.progressBorder,
        );
      case 'resolved':
        return pill(
          REPORT_STATUS_LABELS.resolved,
          icons.check,
          colors.success,
          colors.successSoft,
          colors.successBorder,
        );
      case 'invalid':
        // Gray, not red: a closed report isn't an emergency.
        return pill(
          REPORT_STATUS_LABELS.invalid,
          icons.closed,
          colors.textMuted,
          colors.background,
          colors.border,
        );
      case 'received':
        return blue(REPORT_STATUS_LABELS.received, icons.sent);
      default:
        return blue('Sent', icons.sent);
    }
  }
  // Not delivered yet: still on the phone.
  return pill(
    isRetryingAfterError(report) ? 'Not sent yet' : 'Waiting for signal',
    icons.queued,
    colors.warning,
    colors.warningSoft,
    colors.warningBorder,
  );
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
