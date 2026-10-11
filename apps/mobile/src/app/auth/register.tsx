import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isValidEmail, PASSWORD_MIN_LENGTH } from '@banabaconnect/shared';
import { FormField } from '@/components/FormField';
import { GoogleButton } from '@/components/GoogleButton';
import { Icon, icons } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ErrorBanner, messageFor, OrDivider, useGoogleSignIn } from '@/features/auth/AuthParts';
import { createAuthStyles } from '@/features/auth/authStyles';
import { continueAfterSignIn, signUpWithEmail } from '@/features/auth/signIn';
import { useTheme, useThemedStyles } from '@/theme';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createAuthStyles);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const google = useGoogleSignIn(setError);

  const errors = {
    fullName: fullName.trim().length < 2 ? 'Enter your full name.' : null,
    email: !email.trim()
      ? 'Enter your email.'
      : !isValidEmail(email)
        ? 'Check your email, e.g. juan@gmail.com.'
        : null,
    password:
      password.length < PASSWORD_MIN_LENGTH
        ? `Use at least ${PASSWORD_MIN_LENGTH} characters.`
        : null,
    confirm: confirm !== password ? 'Passwords do not match.' : null,
  };
  const firstProblem = Object.values(errors).find(Boolean) ?? null;

  async function handleCreate() {
    setError(null);
    setCreating(true);
    try {
      const result = await signUpWithEmail(email, password, fullName);
      if (result === 'confirmEmail') {
        setSentTo(email.trim());
      } else {
        await continueAfterSignIn();
      }
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setCreating(false);
    }
  }

  if (sentTo) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <Icon name={icons.mail} size={56} color={colors.selected} />
          <Text style={[styles.title, { textAlign: 'center' }]}>Check your email</Text>
          <Text style={[styles.infoText, { textAlign: 'center' }]}>
            We sent a link to {sentTo}. Open it on this phone to finish creating your account.
          </Text>
          <View style={{ alignSelf: 'stretch' }}>
            <PrimaryButton label="Go to sign in" onPress={() => router.replace('/auth/sign-in')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.step}>Step 1 of 2</Text>
          <Text style={[styles.title, styles.titleAfterStep]}>Create your account</Text>
          <Text style={styles.subtitle}>
            You can report without an account. With one, the barangay can follow up with you and
            your reports can be verified.
          </Text>

          <View style={styles.card}>
            <FormField
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              error={errors.fullName}
              placeholder="Juan Dela Cruz"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />
            <FormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              placeholder="juan@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <FormField
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
              password
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <FormField
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              error={errors.confirm}
              password
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />
          </View>

          <ErrorBanner message={error} />

          <PrimaryButton
            label={creating ? 'Creating account…' : 'Create account'}
            icon={icons.personAdd}
            busy={creating}
            disabled={Boolean(firstProblem) || google.busy}
            hint={firstProblem}
            onPress={handleCreate}
          />

          <OrDivider label="or" />

          <GoogleButton
            label="Continue with Google"
            busy={google.busy}
            disabled={creating}
            onPress={google.start}
          />

          <View style={styles.linkRow}>
            <Text style={styles.linkPrompt}>Already registered?</Text>
            <Pressable
              onPress={() => router.replace('/auth/sign-in')}
              hitSlop={12}
              accessibilityRole="link"
            >
              <Text style={styles.link}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
