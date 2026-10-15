import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReportCategory } from '@banabaconnect/shared';
import { Icon, icons } from './Icon';
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
  return (
    <View style={[styles.circle, style, { backgroundColor: palette.background }]} accessible={false}>
      <Icon name={look.icon} size={size} color={palette.icon} />
      {category === 'road_blockage' && (
        <View style={[styles.blocked, { backgroundColor: scheme === 'dark' ? '#41281D' : '#FFF0E3' }]}>
          <Icon name={icons.closed} size={14} color={scheme === 'dark' ? '#FFAB70' : '#D34B12'} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  blocked: { position: 'absolute', bottom: 3, right: 3, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
