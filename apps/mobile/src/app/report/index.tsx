import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_LABELS, REPORT_CATEGORIES, type ReportCategory } from '@banabaconnect/shared';
import { Icon } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { CATEGORY_APPEARANCE } from '@/features/report/categoryAppearance';
import { OFFLINE_REPORT_MESSAGE } from '@/features/report/messages';
import { colors, radius } from '@/theme';

export default function ChooseCategoryScreen() {
  function choose(category: ReportCategory) {
    router.push({ pathname: '/report/details', params: { category } });
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.step}>Step 1 of 2</Text>
      <Text style={styles.title}>What is happening?</Text>
      <Text style={styles.subtitle}>Ano ang nangyayari? Tap the closest match.</Text>

      <OfflineBanner message={OFFLINE_REPORT_MESSAGE} style={styles.offlineBanner} />

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
              <View style={[styles.tileIcon, { backgroundColor: look.tint }]}>
                <Icon name={look.icon} size={32} color={look.color} />
              </View>
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  step: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.selected,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 20,
  },
  offlineBanner: {
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  tile: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    minHeight: 140,
  },
  tilePressed: {
    borderColor: colors.selected,
    backgroundColor: colors.selectedSoft,
  },
  tileIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tileLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  tileTagalog: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
});
