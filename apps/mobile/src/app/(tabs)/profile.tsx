import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, icons } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { colors, radius } from '@/theme';

// TODO: registration, login, and Barangay ID verification (Supabase Auth).
export default function ProfileScreen() {
  const version = Constants.expoConfig?.version;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <OfflineBanner style={styles.offlineBanner} />

      <View style={styles.identity}>
        <Icon name={icons.profile} size={48} color={colors.textMuted} />
        <View style={styles.flex}>
          <Text style={styles.name}>Guest</Text>
          <Text style={styles.status}>Not verified</Text>
        </View>
      </View>

      <View style={styles.note}>
        <Text style={styles.noteTitle}>Reporting as a guest</Text>
        <Text style={styles.noteText}>
          Your reports still reach the barangay, but verified residents get higher priority.
          Resident accounts with Barangay ID verification are not available yet.
        </Text>
      </View>

      {version && <Text style={styles.version}>BanabaConnect v{version}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  flex: {
    flex: 1,
  },
  offlineBanner: {
    marginBottom: 20,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  status: {
    fontSize: 15,
    color: colors.warning,
    marginTop: 2,
  },
  note: {
    marginTop: 20,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  noteText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
    marginTop: 4,
  },
  version: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 24,
  },
});
