import { router, type Href } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, icons, type IconName } from '@/components/Icon';
import { colors, radius } from '@/theme';

interface Service {
  label: string;
  icon: IconName;
  color: string;
  tint: string;
  /** Where the tile goes; `null` shows a "coming soon" notice. */
  href: Href | null;
}

const SERVICES: Service[] = [
  {
    label: 'Report emergency',
    icon: icons.emergency,
    color: colors.emergency,
    tint: colors.emergencySoft,
    href: '/report',
  },
  {
    label: 'My Reports',
    icon: icons.reports,
    color: colors.primary,
    tint: colors.selectedSoft,
    href: '/reports',
  },
  {
    label: 'Hotlines',
    icon: icons.phone,
    color: colors.success,
    tint: colors.successSoft,
    href: '/hotlines',
  },
  {
    label: 'Announcements',
    icon: icons.announce,
    color: '#8D6E00',
    tint: '#FFF6D9',
    href: null,
  },
  {
    label: 'Evacuation centers',
    icon: icons.evacuation,
    color: '#6A1B9A',
    tint: '#F3E8F8',
    href: null,
  },
];

const STEPS: { icon: IconName; title: string; detail: string }[] = [
  { icon: icons.tap, title: 'Choose what is happening', detail: 'Flood, fire, accident, and more.' },
  { icon: icons.location, title: 'We add your location', detail: 'So responders know where to go.' },
  { icon: icons.camera, title: 'Add a photo if you can', detail: 'Optional, but it helps a lot.' },
];

function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Magandang umaga!';
  if (hour < 18) return 'Magandang hapon!';
  return 'Magandang gabi!';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  function openService(service: Service) {
    if (service.href) {
      router.push(service.href);
    } else {
      Alert.alert(service.label, 'This service is coming soon. Abangan!');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.brand}>BanabaConnect</Text>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Text style={styles.location}>Barangay Banaba, San Mateo, Rizal</Text>
      </View>

      <View style={styles.body}>
        <Pressable
          onPress={() => router.push('/report')}
          style={({ pressed }) => [styles.reportCard, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Report an emergency"
        >
          <View style={styles.reportIcon}>
            <Icon name={icons.emergency} size={32} color={colors.onEmergency} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.reportTitle}>Report an emergency</Text>
            <Text style={styles.reportSubtitle}>Mag-report ng emergency · less than a minute</Text>
          </View>
          <Icon name={icons.chevron} size={26} color={colors.emergency} />
        </Pressable>

        <Text style={styles.sectionTitle}>Services</Text>
        <View style={styles.grid}>
          {SERVICES.map((service) => (
            <Pressable
              key={service.label}
              onPress={() => openService(service)}
              style={({ pressed }) => [styles.serviceTile, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={service.href ? service.label : `${service.label}, coming soon`}
            >
              <View style={[styles.serviceIcon, { backgroundColor: service.tint }]}>
                <Icon name={service.icon} size={28} color={service.color} />
              </View>
              <Text style={styles.serviceLabel} numberOfLines={2}>
                {service.label}
              </Text>
              {!service.href && <Text style={styles.soonBadge}>Coming soon</Text>}
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>How reporting works</Text>
        <View style={styles.card}>
          {STEPS.map((step, index) => (
            <View key={step.title} style={[styles.step, index > 0 && styles.stepDivider]}>
              <View style={styles.stepIcon}>
                <Icon name={step.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDetail}>{step.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 56,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  brand: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onPrimary,
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.onPrimary,
    marginTop: 8,
  },
  location: {
    fontSize: 15,
    color: colors.onPrimary,
    opacity: 0.85,
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 16,
    marginTop: -36,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.emergency,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  reportIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.emergency,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.emergency,
  },
  reportSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceTile: {
    width: '31.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    minHeight: 118,
  },
  serviceIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  soonBadge: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  stepDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.selectedSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  stepDetail: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
