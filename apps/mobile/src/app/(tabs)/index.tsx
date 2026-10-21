import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, icons, type IconName } from '@/components/Icon';
import { callNumber, NATIONAL_EMERGENCY_NUMBER } from '@/features/hotlines/call';
import { setThemePreference } from '@/features/appearance/themePreference';
import { BarangaySeal } from '@/components/BarangaySeal';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { SkeletonBlock, SkeletonGroup } from '@/components/Skeleton';
import { avatarUrl, firstName, useAuth } from '@/features/auth/authStore';
import { countWaiting, useQueuedReports } from '@/features/queue/reportsStore';
import { showToast } from '@/features/toast/toastStore';
import { TourTarget, useTourScroll } from '@/features/tutorial/TourTarget';
import {
  radius,
  cardShadow,
  hasColoredHeader,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';

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
  showToast({ message: `${label} isn't ready yet. Abangan!` });
}

export default function HomeScreen() {
  const { colors, scheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { reports } = useQueuedReports();
  const waiting = countWaiting(reports);
  const auth = useAuth();
  const name = auth.status === 'signedIn' ? firstName(auth.profile) : null;
  const tourScroll = useTourScroll('/');

  return (
    // The header color fills the status bar area too; the page scrolls under the fixed top bar.
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <BarangaySeal size={36} />
          <Text style={styles.wordmark}>
            Banaba<Text style={styles.wordmarkAccent}>Connect</Text>
          </Text>
        </View>
        <View style={styles.topActions}>
          <Pressable
            onPress={() => setThemePreference(scheme === 'dark' ? 'light' : 'dark')}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            hitSlop={8}
            accessibilityRole="switch"
            accessibilityLabel="Dark mode"
            accessibilityState={{ checked: scheme === 'dark' }}
          >
            <Icon
              name={scheme === 'dark' ? icons.lightMode : icons.darkMode}
              size={22}
              color={colors.primary}
            />
          </Pressable>
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
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        {...tourScroll}
      >
        <View style={styles.greetingRow}>
          <ProfileAvatar
            uri={avatarUrl(auth)}
            size={52}
            iconSize={40}
            backgroundColor={colors.primarySoft}
            loading={auth.status === 'loading'}
          />
          <View style={styles.flex}>
            {auth.status === 'loading' ? (
              <SkeletonGroup style={styles.greetingSkeleton}>
                <SkeletonBlock width={120} height={22} />
              </SkeletonGroup>
            ) : (
              <Text style={styles.greeting}>Hi, {name ?? 'Guest'}!</Text>
            )}
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
                  <View
                    style={[
                      styles.serviceCircle,
                      !service.href && styles.serviceCircleSoon,
                      pressed && styles.pressed,
                    ]}
                  >
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

        <TourTarget id="home-report">
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
                  <Icon name={icons.phone} size={16} color={colors.emergencyText} />
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
        </TourTarget>

        {/* Same screen as the home-screen widget and the app icon shortcut. */}
        <TourTarget id="home-sos">
          <Pressable
            onPress={() => router.push('/sos')}
            style={({ pressed }) => [styles.sosButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Send SOS and call 911. For when you can't say what is happening."
          >
            <Icon name={icons.sos} size={30} color={colors.onEmergency} />
            <View style={styles.flex}>
              <Text style={styles.sosTitle}>Send SOS</Text>
              <Text style={styles.sosDetail}>Hindi masabi kung ano? Ipapadala ang location mo at tatawag sa 911.</Text>
            </View>
            <Icon name={icons.chevron} size={22} color={colors.onEmergency} />
          </Pressable>
        </TourTarget>

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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.headerBg,
    },
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
      paddingBottom: 12,
      backgroundColor: colors.headerBg,
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexShrink: 1,
    },
    wordmark: {
      fontSize: 22,
      fontWeight: '800',
      color: hasColoredHeader(colors) ? colors.headerText : colors.primary,
      letterSpacing: -0.3,
    },
    wordmarkAccent: {
      color: colors.headerAccent,
    },
    topActions: {
      flexDirection: 'row',
      gap: 12,
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
    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      marginTop: 20,
    },
    greeting: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    /** Same height as the greeting line, so the subline doesn't move when the name loads. */
    greetingSkeleton: {
      paddingVertical: 1,
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
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      ...cardShadow(colors),
    },
    serviceCircleSoon: {
      backgroundColor: colors.border,
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
    sosButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 20,
      marginTop: 12,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: radius.xl,
      backgroundColor: colors.emergency,
    },
    sosTitle: {
      color: colors.onEmergency,
      fontSize: 18,
      fontWeight: '800',
    },
    sosDetail: {
      color: colors.onEmergency,
      fontSize: 13,
      marginTop: 2,
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
      color: colors.emergencyText,
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
      borderColor: colors.emergencyText,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    callButtonText: {
      color: colors.emergencyText,
      fontSize: 15,
      fontWeight: '700',
    },
    bannerArt: {
      width: 80,
      height: 80,
      borderRadius: radius.pill,
      backgroundColor: colors.highlightSoft,
      borderWidth: 3,
      borderColor: colors.highlight,
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
      backgroundColor: colors.highlightSoft,
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
}
