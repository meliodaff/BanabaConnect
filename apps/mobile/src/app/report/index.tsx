import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_LABELS, REPORT_CATEGORIES, type ReportCategory } from '@banabaconnect/shared';
import { Icon } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { CATEGORY_APPEARANCE } from '@/features/report/categoryAppearance';
import { OFFLINE_REPORT_MESSAGE, OFFLINE_REPORT_TITLE } from '@/features/report/messages';
import { colors, radius } from '@/theme';

export default function ChooseCategoryScreen() {
  function choose(category: ReportCategory) {
    router.push({ pathname: '/report/details', params: { category } });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.step}>Step 1 of 2</Text>
      <Text style={styles.title}>What is happening?</Text>
      <Text style={styles.subtitle}>Ano ang nangyayari?</Text>

      <OfflineBanner
        title={OFFLINE_REPORT_TITLE}
        message={OFFLINE_REPORT_MESSAGE}
        style={styles.offlineBanner}
      />

      <View style={styles.grid}>
        {REPORT_CATEGORIES.map((category) => {
          const look = CATEGORY_APPEARANCE[category];
          return (
            <Pressable
              key={category}
              onPress={() => choose(category)}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              accessibilityRole="button"
              accessibilityLabel={`${CATEGORY_LABELS[category]}, ${look.tagalog}`}
            >
              <Icon name={look.icon} size={30} color={colors.text} />
              <Text style={styles.tileLabel}>{CATEGORY_LABELS[category]}</Text>
              <Text style={styles.tileTagalog}>{look.tagalog}</Text>
            </Pressable>
          );
        })}
      </View>
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
    paddingBottom: 40,
  },
  step: {
    fontSize: 14,
    color: colors.textMuted,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 20,
  },
  offlineBanner: {
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  tile: {
    width: '48.5%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    minHeight: 116,
  },
  tilePressed: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  tileLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  tileTagalog: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
});
