import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORY_LABELS } from '@banabaconnect/shared';
import { Icon, icons, type IconName } from '@/components/Icon';
import { PlainStatusBar } from '@/components/PlainStatusBar';
import { callNumber, NATIONAL_EMERGENCY_NUMBER } from '@/features/hotlines/call';
import { useIsOffline } from '@/features/network/useIsOffline';
import { useQueuedReports } from '@/features/queue/reportsStore';
import { radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export default function ReportSentScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { reports, sendingIds } = useQueuedReports();
  const offline = useIsOffline();
  const report = reports.find((r) => r.submission.id === id);
  const label = report ? CATEGORY_LABELS[report.submission.category] : 'Your';

  let icon: IconName;
  let tone: { color: string; background: string };
  let title: string;
  let message: string;
  let busy = false;

  if (report?.syncStatus === 'sent') {
    icon = icons.check;
    tone = { color: colors.success, background: colors.successSoft };
    title = 'Sent to the barangay';
    message = `${label} report received. Salamat! Stay safe and keep your phone with you.`;
  } else if (
    !offline &&
    (!report || report.attempts === 0 || sendingIds.has(report.submission.id))
  ) {
    icon = icons.sending;
    tone = { color: colors.primary, background: colors.primarySoft };
    title = 'Sending your report…';
    message = 'Your report is saved on your phone and is on its way to the barangay.';
    busy = true;
  } else {
    icon = icons.queued;
    tone = { color: colors.warning, background: colors.warningSoft };
    title = 'Saved on your phone';
    message = offline
      ? Platform.OS === 'ios'
        ? 'Your report is saved. Keep BanabaConnect in the app switcher so it can try sending when internet returns. If you swipe it away, reopen it to resume sending.'
        : 'No signal right now. Your report is queued and will be sent automatically as soon as you get even a little signal.'
      : 'Your signal is weak, so the report is queued. We will keep trying and send it automatically.';
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <PlainStatusBar />
      <View style={styles.body}>
        <View style={[styles.statusCircle, { backgroundColor: tone.background }]}>
          {busy ? (
            <ActivityIndicator size="large" color={tone.color} />
          ) : (
            <Icon name={icon} size={60} color={tone.color} />
          )}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        {report?.syncStatus !== 'sent' && (
          <Pressable
            onPress={() => callNumber(NATIONAL_EMERGENCY_NUMBER)}
            style={({ pressed }) => [styles.tip, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Call ${NATIONAL_EMERGENCY_NUMBER}`}
          >
            <Icon name={icons.phone} size={22} color={colors.emergencyText} />
            <View style={styles.tipBody}>
              <Text style={styles.tipTitle}>
                Someone in danger now? Call {NATIONAL_EMERGENCY_NUMBER}
              </Text>
              <Text style={styles.tipText}>Calls work without internet.</Text>
            </View>
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    statusCircle: {
      width: 112,
      height: 112,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
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
    tip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.emergencySoft,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginTop: 24,
      maxWidth: 340,
    },
    tipBody: {
      flex: 1,
    },
    tipTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.emergencyText,
    },
    tipText: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      marginTop: 2,
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
}
