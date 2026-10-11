import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

/**
 * The main action of a form. When it can't be pressed, `hint` says why,
 * so the resident is never left guessing.
 */
export function PrimaryButton({
  label,
  icon,
  hint,
  busy = false,
  disabled = false,
  onPress,
}: {
  label: string;
  icon?: IconName;
  hint?: string | null;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const inactive = disabled || busy;

  return (
    <View>
      <Pressable
        onPress={onPress}
        disabled={inactive}
        style={({ pressed }) => [
          styles.button,
          disabled && styles.buttonDisabled,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive, busy }}
        accessibilityHint={hint ?? undefined}
      >
        {busy ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          icon && <Icon name={icon} size={22} color={colors.onPrimary} />
        )}
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: 18,
    },
    buttonDisabled: {
      backgroundColor: colors.disabled,
    },
    label: {
      color: colors.onPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    hint: {
      textAlign: 'center',
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 8,
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
