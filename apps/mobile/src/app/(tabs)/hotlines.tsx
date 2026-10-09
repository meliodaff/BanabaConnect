import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, icons } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { callNumber } from '@/features/hotlines/call';
import { HOTLINES } from '@/features/hotlines/hotlines';
import { colors, radius } from '@/theme';

export default function HotlinesScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <OfflineBanner
        message="These calls still work without internet."
        style={styles.offlineBanner}
      />
      <Text style={styles.intro}>
        Tap a number to call. Calls use your regular phone signal, so they can work even without
        mobile data.
      </Text>

      <View style={styles.card}>
        {HOTLINES.map((hotline, index) => {
          const { number } = hotline;
          return (
            <Pressable
              key={hotline.name}
              onPress={() => number && callNumber(number)}
              disabled={!number}
              style={({ pressed }) => [
                styles.row,
                index > 0 && styles.rowDivider,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                number
                  ? `Call ${hotline.name}, ${number}`
                  : `${hotline.name}, number not yet available`
              }
            >
              <View style={[styles.phoneIcon, !number && styles.phoneIconMuted]}>
                <Icon
                  name={icons.phone}
                  size={22}
                  color={number ? colors.success : colors.disabled}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.name}>{hotline.name}</Text>
                <Text style={styles.description}>{hotline.description}</Text>
              </View>
              {number ? (
                <View style={styles.callPill}>
                  <Icon name={icons.phone} size={16} color={colors.onPrimary} />
                  <Text style={styles.callPillText}>{number}</Text>
                </View>
              ) : (
                <Text style={styles.pending}>Number not added yet</Text>
              )}
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
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  flex: {
    flex: 1,
  },
  offlineBanner: {
    marginBottom: 16,
  },
  intro: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    minHeight: 64,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  phoneIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneIconMuted: {
    backgroundColor: colors.background,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  callPillText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  pending: {
    fontSize: 13,
    color: colors.textMuted,
    maxWidth: 90,
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.7,
  },
});
