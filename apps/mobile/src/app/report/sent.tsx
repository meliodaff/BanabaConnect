import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORY_LABELS } from '@banabaconnect/shared';
import { Icon, icons, type IconName } from '@/components/Icon';
import { callNumber } from '@/features/hotlines/call';
import { useIsOffline } from '@/features/network/useIsOffline';
import { useQueuedReports } from '@/features/queue/reportsStore';
import { colors, radius } from '@/theme';

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export default function ReportSentScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { reports, sendingIds } = useQueuedReports();
  const offline = useIsOffline();
  const report = reports.find((r) => r.submission.id === id);
  const label = report ? CATEGORY_LABELS[report.submission.category] : 'Your';

  let icon: IconName;
  let color: string;
  let title: string;
  let message: string;
  let busy = false;

  if (report?.syncStatus === 'sent') {
    icon = icons.check;
    color = colors.success;
    title = 'Sent to the barangay';
    message = `${label} report sent${report.sentAt ? ` at ${formatClock(report.sentAt)}` : ''}. You can follow it in My reports.`;
  } else if (
    !offline &&
    (!report || report.attempts === 0 || sendingIds.has(report.submission.id))
  ) {
    icon = icons.sending;
    color = colors.primary;
    title = 'Sending your report';
    message = 'It is saved on your phone and is being sent now.';
    busy = true;
  } else {
    icon = icons.queued;
    color = colors.warning;
    title = 'Saved on your phone';
    message = offline
      ? 'No signal right now. Your report is queued and will be sent automatically as soon as you get even a little signal.'
      : 'Your signal is too weak to send right now. The app keeps retrying and will send it automatically.';
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.body}>
        {busy ? (
          <ActivityIndicator size="large" color={color} style={styles.statusIcon} />
        ) : (
          <View style={styles.statusIcon}>
            <Icon name={icon} size={56} color={color} />
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        {report?.syncStatus !== 'sent' && (
          <Pressable
            onPress={() => callNumber('911')}
            style={({ pressed }) => [styles.callLink, pressed && styles.pressed]}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Icon name={icons.phone} size={20} color={colors.emergency} />
            <Text style={styles.callLinkText}>Someone in danger now? Call 911</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => router.dismissAll()}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>Back to home</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          router.dismissAll();
          router.navigate('/reports');
        }}
        style={styles.secondaryButton}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryButtonText}>View my reports</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 20,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 340,
  },
  callLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  callLinkText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.emergency,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
