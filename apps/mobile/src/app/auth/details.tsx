import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BARANGAY_AREAS, normalizePhone } from '@banabaconnect/shared';
import { FormField } from '@/components/FormField';
import { icons } from '@/components/Icon';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ErrorBanner } from '@/features/auth/AuthParts';
import { avatarUrl, useAuth } from '@/features/auth/authStore';
import { createAuthStyles } from '@/features/auth/authStyles';
import { MissingProfileError, saveResidentDetails } from '@/features/auth/residentProfile';
import { showToast } from '@/features/toast/toastStore';
import { useTheme, useThemedStyles } from '@/theme';

export default function ResidentDetailsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createAuthStyles);
  const auth = useAuth();
  const profile = auth.status === 'signedIn' ? auth.profile : null;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fill in anything saved earlier, without overwriting what the resident has typed.
  if (profile && !prefilled) {
    setPrefilled(true);
    setPhone(phone || profile.phone || '');
    setArea(area ?? profile.area);
    setAddress(address || profile.address || '');
  }

  if (auth.status === 'guest') {
    return <Redirect href="/auth/sign-in" />;
  }
  if (auth.status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.selected} />
      </View>
    );
  }

  // The name comes from Google or the sign-up form; only ask if the account somehow has none.
  const accountName = profile?.full_name?.trim() || null;
  const email = auth.session.user.email;
  const normalizedPhone = normalizePhone(phone);
  const errors = {
    fullName: !accountName && fullName.trim().length < 2 ? 'Enter your full name.' : null,
    phone: !phone.trim()
      ? 'Enter your mobile number.'
      : !normalizedPhone
        ? 'Use an 11-digit mobile number, e.g. 0917 123 4567.'
        : null,
    area: area ? null : 'Choose your sitio or purok.',
  };
  const firstProblem = Object.values(errors).find(Boolean) ?? null;

  async function handleSave() {
    if (!normalizedPhone || !area) {
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveResidentDetails({
        fullName: accountName ?? fullName,
        phone: normalizedPhone,
        area,
        address,
      });
    } catch (caught) {
      console.warn('Could not save resident details', caught);
      setError(
        caught instanceof MissingProfileError
          ? 'Your account is missing its resident record, so your details could not be saved. Please contact the barangay.'
          : 'Your details were not saved. Check your signal and try again.',
      );
      setSaving(false);
      return;
    }
    router.dismissTo('/profile');
    showToast({
      tone: 'success',
      message: 'You are registered. Verify your Barangay ID anytime from the Profile tab.',
      duration: 5000,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.step}>Step 2 of 2</Text>
          <Text style={[styles.title, styles.titleAfterStep]}>Your details</Text>
          <Text style={styles.subtitle}>
            The barangay uses these to contact you about your reports.
          </Text>

          {accountName && (
            <View style={[styles.infoBanner, { alignItems: 'center' }]}>
              <ProfileAvatar
                uri={avatarUrl(auth)}
                size={44}
                iconSize={28}
                backgroundColor={colors.surface}
              />
              <View style={styles.flex}>
                <Text style={styles.infoTitle}>{accountName}</Text>
                {email && <Text style={styles.infoText}>{email}</Text>}
              </View>
            </View>
          )}

          <View style={styles.card}>
            {!accountName && (
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
            )}
            <FormField
              label="Mobile number"
              value={phone}
              onChangeText={setPhone}
              error={errors.phone}
              placeholder="0917 123 4567"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={16}
            />
          </View>

          <View style={styles.card}>
            <View>
              <Text style={styles.fieldLabel}>Sitio or purok</Text>
              <View style={styles.chips} accessibilityRole="radiogroup">
                {BARANGAY_AREAS.map((option) => {
                  const selected = area === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setArea(option)}
                      style={[styles.chip, selected && styles.chipSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <FormField
              label="House no. and street"
              hint="Optional. Helps responders find your home."
              value={address}
              onChangeText={setAddress}
              placeholder="123 Mabini St."
              autoCapitalize="words"
              autoComplete="street-address"
              textContentType="fullStreetAddress"
            />
          </View>

          <ErrorBanner message={error} />
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={saving ? 'Saving…' : 'Finish registration'}
            icon={icons.check}
            busy={saving}
            disabled={Boolean(firstProblem)}
            hint={firstProblem}
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
