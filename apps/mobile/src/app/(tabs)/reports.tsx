import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, icons } from '@/components/Icon';
import { colors, radius } from '@/theme';

// TODO: list reports from the offline queue (SQLite) with their sync and barangay status.
export default function MyReportsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon name={icons.reports} size={44} color={colors.primary} />
      </View>
      <Text style={styles.title}>No reports yet</Text>
      <Text style={styles.message}>
        Reports you send will appear here so you can follow what the barangay is doing about
        them.
      </Text>
      <Pressable
        onPress={() => router.push('/report')}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Report an emergency</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.selectedSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.emergency,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: colors.onEmergency,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
