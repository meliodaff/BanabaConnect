import { StyleSheet, Text, View } from 'react-native';
import { Icon, icons } from '@/components/Icon';
import { radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

/**
 * Words written by barangay staff, shown as an official notice: a solid title band, the message,
 * and a signature with the staff avatar.
 * - Brand blue for information (e.g. a note on a resolved report).
 * - Amber when the resident has to do something (e.g. send a new ID photo), matching the other
 *   "needs your attention" states. Never red: red means an emergency.
 */
export function StaffNote({
  note,
  time,
  actionNeeded = false,
}: {
  note: string;
  /** When staff wrote it, already formatted. */
  time?: string | null;
  /** The resident has to do something about it, e.g. send a new ID photo. */
  actionNeeded?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const tone = actionNeeded
    ? { main: colors.warning, onMain: colors.onWarning, body: colors.warningSoft }
    : { main: colors.primary, onMain: colors.onPrimary, body: colors.surface };

  return (
    <View
      style={[styles.notice, { borderColor: tone.main, backgroundColor: tone.body }]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${actionNeeded ? 'Action needed. ' : ''}Message from Barangay Banaba${
        time ? `, ${time}` : ''
      }: ${note}`}
    >
      <View style={[styles.band, { backgroundColor: tone.main }]}>
        <Icon name={icons.barangay} size={18} color={tone.onMain} />
        <Text style={[styles.bandText, { color: tone.onMain }]}>Message from Barangay Banaba</Text>
        {actionNeeded && (
          // Inverted from the band so it stands out on the amber.
          <View style={[styles.actionTag, { backgroundColor: tone.onMain }]}>
            <Icon name={icons.alert} size={13} color={tone.main} />
            <Text style={[styles.actionTagText, { color: tone.main }]}>Action needed</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.note}>{note}</Text>
        <View style={styles.signature}>
          <View style={[styles.avatar, { backgroundColor: tone.main }]}>
            <Icon name={icons.person} size={16} color={tone.onMain} />
          </View>
          <View>
            <Text style={styles.signatureName}>Barangay staff</Text>
            {time ? <Text style={styles.signatureTime}>{time}</Text> : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    notice: {
      marginTop: 12,
      borderRadius: radius.md,
      borderWidth: 1.5,
      overflow: 'hidden',
    },
    band: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    bandText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    actionTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    actionTagText: {
      fontSize: 12,
      fontWeight: '800',
    },
    body: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 12,
    },
    note: {
      fontSize: 16,
      lineHeight: 23,
      fontWeight: '600',
      color: colors.text,
    },
    signature: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signatureName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    signatureTime: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
