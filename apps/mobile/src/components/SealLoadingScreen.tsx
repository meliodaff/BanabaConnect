import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BarangaySeal } from '@/components/BarangaySeal';
import { PlainStatusBar } from '@/components/PlainStatusBar';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

/**
 * A full-screen wait with the Barangay Banaba seal, for moments the whole app is busy with the
 * account (signing in, signing out). Screen readers hear the title and message once.
 */
export function SealLoadingScreen({ title, message }: { title: string; message?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View
      style={styles.screen}
      accessible
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
      accessibilityLabel={message ? `${title} ${message}` : title}
    >
      <PlainStatusBar />
      <BarangaySeal size={120} />
      <View style={styles.row}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 32,
      backgroundColor: colors.background,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    message: {
      fontSize: 15,
      lineHeight: 21,
      color: colors.textMuted,
      textAlign: 'center',
      maxWidth: 300,
    },
  });
}
