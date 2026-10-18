import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReportCategory } from '@banabaconnect/shared';
import { Icon } from './Icon';
import { CATEGORY_APPEARANCE } from '@/features/report/categoryAppearance';
import { useTheme } from '@/theme';

/** Familiar category symbols, with consistent colors throughout the report flow. */
export function ReportCategoryIcon({ category, size = 32, style }: {
  category: ReportCategory;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { scheme } = useTheme();
  const look = CATEGORY_APPEARANCE[category];
  const palette = look.colors[scheme];
  const badgePalette = look.badge?.colors[scheme];
  return (
    <View style={[styles.circle, style, { backgroundColor: palette.background }]} accessible={false}>
      <Icon name={look.icon} size={size} color={palette.icon} />
      {look.badge && badgePalette && (
        <View style={[styles.badge, { backgroundColor: badgePalette.background }]}>
          <Icon name={look.badge.icon} size={14} color={badgePalette.icon} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', bottom: 3, right: 3, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
