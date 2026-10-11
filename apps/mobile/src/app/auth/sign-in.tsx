import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isValidEmail } from '@banabaconnect/shared';
import { FormField } from '@/components/FormField';
import { GoogleButton } from '@/components/GoogleButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ErrorBanner, messageFor, OrDivider, useGoogleSignIn } from '@/features/auth/AuthParts';
import { createAuthStyles } from '@/features/auth/authStyles';
import { continueAfterSignIn, signInWithEmail } from '@/features/auth/signIn';
import { useThemedStyles } from '@/theme';

export default function SignInScreen() {
  const styles = useThemedStyles(createAuthStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const google = useGoogleSignIn(setError);
  const busy = signingIn || google.busy;

  const emailError = !email.trim()
    ? 'Enter your email.'
    : !isValidEmail(email)
      ? 'Check your email, e.g. juan@gmail.com.'
      : null;
  const canSubmit = !emailError && password.length > 0;

  async function handleSignIn() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithEmail(email, password);
      await continueAfterSignIn();
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Use the Google account or email you registered with.
          </Text>

          <View style={styles.card}>
            <FormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={emailError}
              placeholder="juan@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            <FormField
              label="Password"
              value={password}
              onChangeText={setPassword}
              password
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => canSubmit && !busy && handleSignIn()}
            />
          </View>

          <ErrorBanner message={error} />

          <PrimaryButton
            label={signingIn ? 'Signing in…' : 'Sign in'}
            busy={signingIn}
            disabled={!canSubmit || google.busy}
            hint={canSubmit ? null : 'Enter your email and password to sign in.'}
            onPress={handleSignIn}
          />

          <OrDivider label="or" />

          <GoogleButton busy={google.busy} disabled={busy} onPress={google.start} />

          <View style={styles.linkRow}>
            <Text style={styles.linkPrompt}>No account yet?</Text>
            <Pressable
              onPress={() => router.replace('/auth/register')}
              hitSlop={12}
              accessibilityRole="link"
            >
              <Text style={styles.link}>Create an account</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.back()}
            style={styles.textButton}
            accessibilityRole="button"
          >
            <Text style={styles.linkPrompt}>Not now, keep reporting as a guest</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
