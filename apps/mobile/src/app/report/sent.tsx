import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORY_LABELS, REPORT_CATEGORIES, type ReportCategory } from '@banabaconnect/shared';
import { Icon, icons } from '@/components/Icon';
import { colors, radius } from '@/theme';

export default function ReportSentScreen() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const label = (REPORT_CATEGORIES as readonly string[]).includes(category ?? '')
    ? CATEGORY_LABELS[category as ReportCategory]
    : 'Your';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.body}>
        <View style={styles.checkCircle}>
          <Icon name={icons.check} size={64} color={colors.success} />
        </View>
        <Text style={styles.title}>Report created</Text>
        <Text style={styles.message}>
          {label} report is ready. Salamat! Stay safe and keep your phone with you.
        </Text>
      </View>

      <Pressable
        onPress={() => router.dismissAll()}
        style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Text style={styles.doneButtonText}>Back to home</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 112,
    height: 112,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  message: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 320,
  },
  doneButton: {
    backgroundColor: colors.selected,
    borderRadius: radius.md,
    paddingVertical: 18,
    alignItems: 'center',
  },
  doneButtonText: {
    color: colors.onSelected,
    fontSize: 17,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
