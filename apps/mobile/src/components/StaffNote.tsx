import { StyleSheet, Text, View } from 'react-native';
import { Icon, icons } from '@/components/Icon';
import { radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

/**
 * Words written by barangay staff (e.g. why a Barangay ID wasn't approved), labeled so the
 * resident can tell them apart from the app's own text.
 */
export function StaffNote({ note }: { note: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View
      style={styles.box}
      accessible
      accessibilityLabel={`Note from Barangay Banaba staff: ${note}`}
    >
      <View style={styles.labelRow}>
        <Icon name={icons.staffNote} size={16} color={colors.primary} />
        <Text style={styles.label}>Note from Barangay Banaba staff</Text>
      </View>
      <Text style={styles.note}>“{note}”</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    box: {
      marginTop: 10,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      backgroundColor: colors.background,
      borderRadius: radius.md,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    note: {
      fontSize: 15,
      lineHeight: 21,
      color: colors.text,
    },
  });
}
