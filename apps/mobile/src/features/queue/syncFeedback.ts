import { router } from 'expo-router';
import { CATEGORY_LABELS, type ReportCategory } from '@banabaconnect/shared';
import { icons } from '@/components/Icon';
import { showToast } from '@/features/toast/toastStore';

/** Loaded only for foreground feedback; background tasks don't need navigation or UI. */
export function notifyReportSent(id: string, category: ReportCategory) {
  const kind = category === 'other' ? '' : `${CATEGORY_LABELS[category].toLowerCase()} `;
  showToast({
    tone: 'success',
    icon: icons.sent,
    message: `Your ${kind}report was sent to the barangay.`,
    action: {
      label: 'View',
      onPress: () => router.push({ pathname: '/reports/[id]', params: { id } }),
    },
  });
}
