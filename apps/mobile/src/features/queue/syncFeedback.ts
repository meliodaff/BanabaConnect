import { router } from 'expo-router';
import type { ReportCategory } from '@banabaconnect/shared';
import { icons } from '@/components/Icon';
import { CATEGORY_APPEARANCE } from '@/features/report/categoryAppearance';
import { showToast } from '@/features/toast/toastStore';

/** Loaded only for foreground feedback; background tasks don't need navigation or UI. */
export function notifyReportSent(id: string, category: ReportCategory) {
  // In Tagalog, like the rest of the report's status. Plain "report mo" for Other.
  const about = category === 'other' ? '' : ` tungkol sa ${CATEGORY_APPEARANCE[category].tagalog.toLowerCase()}`;
  showToast({
    tone: 'success',
    icon: icons.sent,
    message: `Naipadala na sa barangay ang report mo${about}.`,
    action: {
      label: 'Tingnan',
      onPress: () => router.push({ pathname: '/reports/[id]', params: { id } }),
    },
  });
}
