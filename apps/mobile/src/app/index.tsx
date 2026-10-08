import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, icons, type IconName } from '@/components/Icon';
import { colors, radius } from '@/theme';

const STEPS: { icon: IconName; title: string; detail: string }[] = [
  {
    icon: icons.tap,
    title: 'Choose what is happening',
    detail: 'Flood, fire, accident, and more.',
  },
  {
    icon: icons.location,
    title: 'We add your location',
    detail: 'So responders know where to go.',
  },
  {
    icon: icons.camera,
    title: 'Add a photo if you can',
    detail: 'Optional, but it helps the barangay understand.',
  },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>BanabaConnect</Text>
        <Text style={styles.greeting}>Kumusta! Need help?</Text>
        <Text style={styles.subheading}>
          Tell Barangay Banaba what is happening near you. It takes less than a minute.
        </Text>

        <Pressable
          onPress={() => router.push('/report')}
          style={({ pressed }) => [styles.reportCard, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Report an emergency"
        >
          <View style={styles.reportIcon}>
            <Icon name={icons.emergency} size={36} color={colors.emergency} />
          </View>
          <View style={styles.reportTextWrap}>
            <Text style={styles.reportTitle}>Report an emergency</Text>
            <Text style={styles.reportSubtitle}>Mag-report ng emergency</Text>
          </View>
          <Icon name={icons.next} size={28} color={colors.onEmergency} />
        </Pressable>

        <Text style={styles.sectionTitle}>How it works</Text>
        <View style={styles.stepsCard}>
          {STEPS.map((step, index) => (
            <View key={step.title} style={[styles.step, index > 0 && styles.stepDivider]}>
              <View style={styles.stepIcon}>
                <Icon name={step.icon} size={22} color={colors.selected} />
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDetail}>{step.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  brand: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.emergency,
    letterSpacing: 0.5,
    marginTop: 8,
  },
  greeting: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
  },
  subheading: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.textMuted,
    marginTop: 8,
  },
  reportCard: {
    marginTop: 28,
    backgroundColor: colors.emergency,
    borderRadius: radius.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  reportIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.onEmergency,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTextWrap: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onEmergency,
  },
  reportSubtitle: {
    fontSize: 15,
    color: colors.onEmergency,
    opacity: 0.9,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: 32,
    marginBottom: 12,
  },
  stepsCard: {
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
  stepTextWrap: {
    flex: 1,
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
