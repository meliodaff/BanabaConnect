import Constants from 'expo-constants';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, icons, type IconName } from '@/components/Icon';
import {
  setThemePreference,
  useThemePreference,
  type ThemePreference,
} from '@/features/appearance/themePreference';
import { radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

// TODO: registration, login, and Barangay ID verification (Supabase Auth).
export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Icon name={icons.profile} size={56} color={colors.primary} />
        </View>
        <Text style={styles.name}>Guest</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Not verified</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Icon name={icons.info} size={22} color={colors.primary} />
        <View style={styles.flex}>
          <Text style={styles.infoTitle}>Resident accounts are coming soon</Text>
          <Text style={styles.infoText}>
            Soon you can register and verify with your Barangay ID. Reports from verified residents
            are given higher priority.
          </Text>
        </View>
      </View>

      <AppearanceSetting />

      <Text style={styles.version}>BanabaConnect v{Constants.expoConfig?.version ?? '—'}</Text>
    </ScrollView>
  );
}

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Match phone', icon: icons.phoneSetting },
  { value: 'light', label: 'Light', icon: icons.lightMode },
  { value: 'dark', label: 'Dark', icon: icons.darkMode },
];

function AppearanceSetting() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const preference = useThemePreference();

  return (
    <View style={styles.settingCard}>
      <View style={styles.settingHeader}>
        <Icon name={icons.appearance} size={20} color={colors.textMuted} />
        <Text style={styles.settingTitle}>Appearance</Text>
      </View>
      <View style={styles.segments} accessibilityRole="radiogroup">
        {APPEARANCE_OPTIONS.map((option) => {
          const selected = preference === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setThemePreference(option.value)}
              style={({ pressed }) => [
                styles.segment,
                selected && styles.segmentSelected,
                pressed && styles.pressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label} appearance`}
            >
              <Icon
                name={option.icon}
                size={20}
                color={selected ? colors.onSelected : colors.textMuted}
              />
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    flex: {
      flex: 1,
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      alignItems: 'center',
      paddingVertical: 24,
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: radius.pill,
      backgroundColor: colors.selectedSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      marginTop: 12,
    },
    badge: {
      marginTop: 8,
      backgroundColor: colors.warningSoft,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.warning,
    },
    infoCard: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: colors.selectedSoft,
      borderRadius: radius.lg,
      padding: 16,
      marginTop: 16,
    },
    infoTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    infoText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      marginTop: 4,
    },
    settingCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 16,
      marginTop: 16,
    },
    settingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    segments: {
      flexDirection: 'row',
      gap: 8,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      minHeight: 64,
      paddingVertical: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    segmentSelected: {
      backgroundColor: colors.selected,
      borderColor: colors.selected,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    segmentTextSelected: {
      color: colors.onSelected,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.85,
    },
    version: {
      textAlign: 'center',
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 24,
    },
  });
}
