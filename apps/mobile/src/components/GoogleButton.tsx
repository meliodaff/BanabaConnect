import { ActivityIndicator, Image, Pressable, StyleSheet, Text } from 'react-native';
import { radius, useThemedStyles, type ThemeColors } from '@/theme';

/** Google's sign-in button: white with the "G" logo in light and dark mode, per Google's branding rules. */
export function GoogleButton({
  label = 'Continue with Google',
  busy,
  disabled,
  onPress,
}: {
  label?: string;
  busy: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: busy || disabled }}
    >
      {busy ? (
        <ActivityIndicator color="#1F1F1F" />
      ) : (
        <Image source={require('../../assets/google-g.png')} style={styles.logo} />
      )}
      <Text style={styles.label}>{busy ? 'Waiting for Google…' : label}</Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      minHeight: 54,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#FFFFFF',
    },
    logo: {
      width: 20,
      height: 20,
    },
    label: {
      fontSize: 17,
      fontWeight: '600',
      color: '#1F1F1F',
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
