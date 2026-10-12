import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { PlainStatusBar } from '@/components/PlainStatusBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SealLoadingScreen } from '@/components/SealLoadingScreen';
import { messageFor } from '@/features/auth/AuthParts';
import { createAuthStyles } from '@/features/auth/authStyles';
import {
  continueAfterSignIn,
  exchangeAuthCode,
  isGoogleSignInInProgress,
} from '@/features/auth/signIn';
import { useThemedStyles } from '@/theme';

// On the web, Google opens in a popup; this hands the result back to the page that opened it.
const popupResult = Platform.OS === 'web' ? WebBrowser.maybeCompleteAuthSession() : null;

/**
 * Where Google (and the email confirmation link) sends the resident back to the app.
 * Usually the sign-in screen finishes the job; this route covers links opened from outside,
 * like the confirmation email.
 */
export default function AuthCallbackScreen() {
  const styles = useThemedStyles(createAuthStyles);
  const { code, error_description: googleError } = useLocalSearchParams<{
    code?: string;
    error_description?: string;
  }>();
  // When the sign-in screen is still waiting on Google, it finishes the job instead of this route.
  const [handledElsewhere] = useState(
    () => popupResult?.type === 'success' || isGoogleSignInInProgress(),
  );
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const error =
    exchangeError ??
    (!handledElsewhere && !code ? 'This sign-in link did not work. Please sign in again.' : null);

  useEffect(() => {
    if (handledElsewhere) {
      return;
    }
    if (!code) {
      if (googleError) {
        console.warn('Sign-in link returned an error', googleError);
      }
      return;
    }
    exchangeAuthCode(code)
      .then(continueAfterSignIn)
      .catch((caught) => setExchangeError(messageFor(caught)));
  }, [code, googleError, handledElsewhere]);

  if (popupResult?.type === 'success') {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Signed in. You can close this window.</Text>
      </View>
    );
  }

  if (!error) {
    return <SealLoadingScreen title="Signing you in…" />;
  }

  return (
    <View style={styles.centered}>
      <PlainStatusBar />
      <Text style={[styles.infoTitle, { textAlign: 'center' }]}>{error}</Text>
      <View style={{ alignSelf: 'stretch' }}>
        <PrimaryButton label="Go to sign in" onPress={() => router.replace('/auth/sign-in')} />
      </View>
    </View>
  );
}
