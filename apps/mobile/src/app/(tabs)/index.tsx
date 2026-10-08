import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, icons, type IconName } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { callNumber } from '@/features/hotlines/call';
import { countWaiting, useQueuedReports } from '@/features/queue/reportsStore';
import { colors, radius } from '@/theme';

const NATIONAL_EMERGENCY_NUMBER = '911';

interface QuickAction {
  label: string;
  detail: string;
  icon: IconName;
  color: string;
  onPress: () => void;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: `Call ${NATIONAL_EMERGENCY_NUMBER}`,
    detail: 'National hotline',
    icon: icons.phone,
    color: colors.emergency,
    onPress: () => callNumber(NATIONAL_EMERGENCY_NUMBER),
  },
  {
    label: 'Hotlines',
    detail: 'All numbers',
    icon: icons.phone,
    color: colors.primary,
    onPress: () => router.push('/hotlines'),
  },
  {
    label: 'My reports',
    detail: 'Check status',
    icon: icons.reports,
    color: colors.primary,
    onPress: () => router.push('/reports'),
  },
];

export default function HomeScreen() {
  const { reports } = useQueuedReports();
  const waiting = countWaiting(reports);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.wordmark}>
          Banaba<Text style={styles.wordmarkAccent}>Connect</Text>
        </Text>
        <Text style={styles.place}>Barangay Banaba, San Mateo, Rizal</Text>

        <OfflineBanner style={styles.offlineBanner} />

        <Pressable
          onPress={() => router.push('/report')}
          style={({ pressed }) => [styles.reportButton, pressed && styles.reportButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Report an emergency"
        >
          <Icon name={icons.emergency} size={36} color={colors.onEmergency} />
          <View style={styles.flex}>
            <Text style={styles.reportTitle}>Report an emergency</Text>
            <Text style={styles.reportDetail}>Works with no signal. Sent when you reconnect.</Text>
          </View>
          <Icon name={icons.chevron} size={26} color={colors.onEmergency} />
        </Pressable>

        {waiting > 0 && (
          <Pressable
            onPress={() => router.push('/reports')}
            style={({ pressed }) => [styles.waiting, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Icon name={icons.queued} size={22} color={colors.warning} />
            <View style={styles.flex}>
              <Text style={styles.waitingTitle}>
                {waiting === 1
                  ? '1 report waiting for signal'
                  : `${waiting} reports waiting for signal`}
              </Text>
              <Text style={styles.waitingText}>Saved on your phone. Sends automatically.</Text>
            </View>
            <Icon name={icons.chevron} size={22} color={colors.textMuted} />
          </Pressable>
        )}

        <View style={styles.actions}>
          {QUICK_ACTIONS.map((action, index) => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.action,
                index > 0 && styles.actionDivider,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <Icon name={action.icon} size={26} color={action.color} />
              <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
              <Text style={styles.actionDetail}>{action.detail}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.comingSoon}>
          Coming soon: barangay announcements and evacuation centers.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  flex: {
    flex: 1,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 8,
  },
  wordmarkAccent: {
    color: colors.emergency,
  },
  place: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 2,
  },
  offlineBanner: {
    marginTop: 20,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.emergency,
    borderRadius: radius.lg,
    paddingVertical: 22,
    paddingHorizontal: 18,
    marginTop: 20,
  },
  reportButtonPressed: {
    backgroundColor: '#B71C1C',
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onEmergency,
  },
  reportDetail: {
    fontSize: 14,
    color: colors.onEmergency,
    marginTop: 4,
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },
  waitingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  waitingText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 4,
    minHeight: 96,
  },
  actionDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  actionDetail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 20,
  },
  pressed: {
    backgroundColor: colors.background,
  },
});
