import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Icon, icons } from '@/components/Icon';
import { radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

interface FormFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  label: string;
  /** Shown under the field until there's an error, e.g. "Optional" or a format example. */
  hint?: string;
  /** Shown once the resident leaves the field, or right away after they press the main button. */
  error?: string | null;
  showError?: boolean;
  /** Adds a show/hide button for passwords. */
  password?: boolean;
}

/** A labelled text box with its error message underneath. */
export function FormField({
  label,
  hint,
  error,
  showError = false,
  password = false,
  onBlur,
  ...inputProps
}: FormFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [touched, setTouched] = useState(false);
  const [hidden, setHidden] = useState(true);
  const visibleError = (touched || showError) && error ? error : null;

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, visibleError && styles.boxError]}>
        <TextInput
          {...inputProps}
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={password && hidden}
          onBlur={(event) => {
            setTouched(true);
            onBlur?.(event);
          }}
          accessibilityLabel={label}
          accessibilityHint={visibleError ?? hint}
        />
        {password && (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            style={styles.toggle}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Icon name={hidden ? icons.show : icons.hide} size={22} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {visibleError ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Icon name={icons.alert} size={16} color={colors.emergencyText} />
          <Text style={styles.error}>{visibleError}</Text>
        </View>
      ) : (
        hint && <Text style={styles.hint}>{hint}</Text>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    label: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    box: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.background,
    },
    boxError: {
      borderColor: colors.emergencyText,
      borderWidth: 1.5,
    },
    input: {
      flex: 1,
      minHeight: 50,
      paddingHorizontal: 12,
      fontSize: 16,
      color: colors.text,
    },
    toggle: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    error: {
      flex: 1,
      fontSize: 14,
      color: colors.emergencyText,
    },
    hint: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 6,
    },
  });
}
