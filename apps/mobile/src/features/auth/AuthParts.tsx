import { useState } from 'react';
import { Text, View } from 'react-native';
import { Icon, icons } from '@/components/Icon';
import { useTheme, useThemedStyles } from '@/theme';
import { createAuthStyles } from './authStyles';
import { continueAfterSignIn, signInWithGoogle, SignInError } from './signIn';

export function OrDivider({ label }: { label: string }) {
  const styles = useThemedStyles(createAuthStyles);
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createAuthStyles);
  if (!message) {
    return null;
  }
  return (
    <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
      <Icon name={icons.alert} size={22} color={colors.emergencyText} />
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

export function messageFor(error: unknown): string {
  return error instanceof SignInError
    ? error.message
    : 'Something went wrong. Check your signal and try again.';
}

/** Runs the Google sign-in and moves on to the right screen. Closing Google's page is not an error. */
export function useGoogleSignIn(onError: (message: string | null) => void) {
  const [busy, setBusy] = useState(false);

  async function start() {
    onError(null);
    setBusy(true);
    try {
      const result = await signInWithGoogle();
      if (result === 'signedIn') {
        await continueAfterSignIn();
      }
    } catch (error) {
      onError(messageFor(error));
    } finally {
      setBusy(false);
    }
  }

  return { busy, start };
}
