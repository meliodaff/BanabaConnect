import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, icons } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { HOTLINES, type Hotline } from '@/features/hotlines/hotlines';
import { colors, radius } from '@/theme';

async function call(hotline: Hotline) {
  if (!hotline.number) {
    return;
  }
  try {
    await Linking.openURL(`tel:${hotline.number}`);
  } catch {
    Alert.alert('Could not start the call', `Please dial ${hotline.number} manually.`);
  }
}

export default function HotlinesScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <OfflineBanner
        message="Don't worry, calling a hotline doesn't need internet."
        style={styles.offlineBanner}
      />
      <Text style={styles.intro}>
        Tap a number to call. Calls use your regular phone signal, so they can work even without
        mobile data.
      </Text>

      <View style={styles.card}>
        {HOTLINES.map((hotline, index) => (
          <Pressable
            key={hotline.name}
            onPress={() => call(hotline)}
            disabled={!hotline.number}
            style={({ pressed }) => [
              styles.row,
              index > 0 && styles.rowDivider,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              hotline.number ? `Call ${hotline.name}, ${hotline.number}` : `${hotline.name}, number not yet available`
            }
          >
            <View style={[styles.phoneIcon, !hotline.number && styles.phoneIconMuted]}>
              <Icon
                name={icons.phone}
                size={22}
                color={hotline.number ? colors.success : colors.disabled}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.name}>{hotline.name}</Text>
              <Text style={styles.description}>{hotline.description}</Text>
            </View>
            {hotline.number ? (
              <Text style={styles.number}>{hotline.number}</Text>
            ) : (
              <Text style={styles.pending}>Number to be added</Text>
            )}
          </Pressable>
        ))}
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
    fontSize: 14,
    lineHeight: 20,
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
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  number: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.success,
  },
  pending: {
    fontSize: 12,
    color: colors.textMuted,
    maxWidth: 80,
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.7,
  },
});
