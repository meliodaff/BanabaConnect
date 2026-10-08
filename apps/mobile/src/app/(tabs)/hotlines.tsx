import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, icons } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { callNumber } from '@/features/hotlines/call';
import { HOTLINES } from '@/features/hotlines/hotlines';
import { colors } from '@/theme';

export default function HotlinesScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <OfflineBanner message="These calls still work." style={styles.offlineBanner} />
      <Text style={styles.intro}>
        Tap a number to call. Calls use your regular phone signal, not mobile data.
      </Text>

      <View style={styles.list}>
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
              <Icon
                name={icons.phone}
                size={22}
                color={number ? colors.emergency : colors.disabled}
              />
              <View style={styles.flex}>
                <Text style={styles.name}>{hotline.name}</Text>
                <Text style={styles.description}>{hotline.description}</Text>
              </View>
              {number ? (
                <Text style={styles.number}>{number}</Text>
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
    backgroundColor: colors.surface,
  },
  content: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  flex: {
    flex: 1,
  },
  offlineBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  intro: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 64,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  number: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.emergency,
  },
  pending: {
    fontSize: 13,
    color: colors.textMuted,
    maxWidth: 90,
    textAlign: 'right',
  },
  pressed: {
    backgroundColor: colors.background,
  },
});
