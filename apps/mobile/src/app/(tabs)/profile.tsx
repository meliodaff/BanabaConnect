import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, icons } from '@/components/Icon';
import { colors, radius } from '@/theme';

// TODO: registration, login, and Barangay ID verification (Supabase Auth).
export default function ProfileScreen() {
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

      <Text style={styles.version}>BanabaConnect v{Constants.expoConfig?.version ?? '—'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 24,
  },
});
