import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Barangay Banaba</Text>
      <Text style={styles.subheading}>Report an emergency to the barangay, even with weak signal.</Text>

      <Pressable
        onPress={() => router.push('/report')}
        style={({ pressed }) => [styles.reportButton, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Text style={styles.reportButtonText}>Report an emergency</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subheading: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 32,
  },
  reportButton: {
    backgroundColor: colors.emergency,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  reportButtonText: {
    color: colors.onEmergency,
    fontSize: 20,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
