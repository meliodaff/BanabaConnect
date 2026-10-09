import { router, type Href } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, icons, type IconName } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { callNumber, NATIONAL_EMERGENCY_NUMBER } from '@/features/hotlines/call';
import { countWaiting, useQueuedReports } from '@/features/queue/reportsStore';
import { colors, radius, shadow } from '@/theme';

interface Service {
  label: string;
  icon: IconName;
  /** Where the tile goes; `null` shows a "coming soon" notice. */
  href: Href | null;
}

const SERVICES: Service[] = [
  { label: 'My Reports', icon: icons.reports, href: '/reports' },
  { label: 'Hotlines', icon: icons.phone, href: '/hotlines' },
  { label: 'Announcements', icon: icons.announce, href: null },
  { label: 'Evacuation', icon: icons.evacuation, href: null },
];

const STEPS: { icon: IconName; title: string; detail: string }[] = [
  { icon: icons.tap, title: 'Choose what is happening', detail: 'Flood, fire, accident, and more.' },
  { icon: icons.location, title: 'We add your location', detail: 'So responders know where to go.' },
  {
    icon: icons.camera,
    title: 'Add a photo',
    detail: 'Optional. Helps responders see how bad it is.',
  },
  {
    icon: icons.queued,
    title: 'No signal? No problem',
    detail: 'Saved on your phone and sent as soon as you get signal.',
  },
];

function comingSoon(label: string) {
  Alert.alert(label, 'This service is coming soon. Abangan!');
}

export default function HomeScreen() {
  const { reports } = useQueuedReports();
  const waiting = countWaiting(reports);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Text style={styles.wordmark}>
            Banaba<Text style={styles.wordmarkAccent}>Connect</Text>
          </Text>
          <Pressable
            onPress={() => router.push('/reports')}
            style={styles.iconButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              waiting > 0 ? `Report updates, ${waiting} waiting for signal` : 'Report updates'
            }
          >
            <Icon name={icons.bell} size={22} color={colors.primary} />
            {waiting > 0 && <Text style={styles.bellBadge}>{waiting}</Text>}
          </Pressable>
        </View>

        <OfflineBanner style={styles.offlineBanner} />

        <View style={styles.greetingRow}>
          <View style={styles.avatar}>
            <Icon name={icons.profile} size={40} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.greeting}>Hi, Guest!</Text>
            <Text style={styles.greetingSub}>Barangay Banaba, San Mateo, Rizal</Text>
          </View>
        </View>

        {waiting > 0 && (
          <Pressable
            onPress={() => router.push('/reports')}
            style={({ pressed }) => [styles.waitingCard, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Icon name={icons.queued} size={24} color={colors.warning} />
            <View style={styles.flex}>
              <Text style={styles.waitingTitle}>
                {waiting === 1
                  ? '1 report waiting for signal'
                  : `${waiting} reports waiting for signal`}
              </Text>
              <Text style={styles.waitingText}>
                Saved on your phone. Sends automatically when you get signal.
              </Text>
            </View>
            <Icon name={icons.chevron} size={22} color={colors.textMuted} />
          </Pressable>
        )}

        <View style={styles.grid}>
          {SERVICES.map((service) => (
            <Pressable
              key={service.label}
              onPress={() =>
                service.href ? router.push(service.href) : comingSoon(service.label)
              }
              style={styles.serviceTile}
              accessibilityRole="button"
              accessibilityLabel={service.href ? service.label : `${service.label}, coming soon`}
            >
              {({ pressed }) => (
                <>
                  <View style={[styles.serviceCircle, pressed && styles.pressed]}>
                    <Icon
                      name={service.icon}
                      size={26}
                      color={service.href ? colors.primary : colors.textMuted}
                    />
                    {!service.href && <Text style={styles.soonBadge}>Soon</Text>}
                  </View>
                  <Text style={styles.serviceLabel} numberOfLines={1} adjustsFontSizeToFit>
                    {service.label}
                  </Text>
                </>
              )}
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => router.push('/report')}
          style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Report an emergency now"
        >
          <View style={styles.flex}>
            <Text style={styles.bannerEyebrow}>May emergency?</Text>
            <Text style={styles.bannerTitle}>Report it to the barangay in a few taps</Text>
            <Text style={styles.bannerNote}>Works even with no signal</Text>
            <View style={styles.bannerActions}>
              <View style={styles.bannerButton}>
                <Text style={styles.bannerButtonText}>Report now</Text>
              </View>
              <Pressable
                onPress={() => callNumber(NATIONAL_EMERGENCY_NUMBER)}
                style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Call ${NATIONAL_EMERGENCY_NUMBER}`}
              >
                <Icon name={icons.phone} size={16} color={colors.emergency} />
                <Text style={styles.callButtonText}>Call {NATIONAL_EMERGENCY_NUMBER}</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.bannerArt}>
            <View style={styles.bannerArtInner}>
              <Icon name={icons.emergency} size={34} color={colors.onEmergency} />
            </View>
          </View>
        </Pressable>

        <Text style={styles.sectionTitle}>How reporting works</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredRow}
        >
          {STEPS.map((step, index) => (
            <View key={step.title} style={styles.featuredCard}>
              <View style={styles.featuredTop}>
                <View style={styles.featuredIcon}>
                  <Icon name={step.icon} size={22} color={colors.primary} />
                </View>
                <Text style={styles.featuredStep}>Step {index + 1}</Text>
              </View>
              <Text style={styles.featuredTitle}>{step.title}</Text>
              <Text style={styles.featuredDetail}>{step.detail}</Text>
            </View>
          ))}
        </ScrollView>
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
    paddingBottom: 32,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  wordmarkAccent: {
    color: colors.brandAccent,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.warning,
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 5,
    overflow: 'hidden',
  },
  offlineBanner: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  greetingSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 24,
    rowGap: 18,
  },
  serviceTile: {
    width: '25%',
    alignItems: 'center',
  },
  serviceCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  soonBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: colors.border,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  serviceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 28,
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
  },
  bannerEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.emergency,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
    lineHeight: 23,
  },
  bannerNote: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
  },
  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
  },
  waitingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  waitingText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  bannerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  bannerButton: {
    backgroundColor: colors.emergency,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerButtonText: {
    color: colors.onEmergency,
    fontSize: 15,
    fontWeight: '700',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.emergency,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  callButtonText: {
    color: colors.emergency,
    fontSize: 15,
    fontWeight: '700',
  },
  bannerArt: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.emergencySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerArtInner: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.emergency,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: 28,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  featuredRow: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  featuredCard: {
    width: 200,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  featuredTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  featuredIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredStep: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  featuredDetail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
