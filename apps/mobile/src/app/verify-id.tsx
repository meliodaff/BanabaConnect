import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, icons } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StaffNote } from '@/components/StaffNote';
import { ErrorBanner } from '@/features/auth/AuthParts';
import { useAuth } from '@/features/auth/authStore';
import { createAuthStyles } from '@/features/auth/authStyles';
import { submitBarangayId } from '@/features/auth/residentProfile';
import {
  PhotoPermissionError,
  pickReportPhoto,
  type PhotoSource,
  type ReportPhoto,
} from '@/features/report/photo';
import { hideToast, showToast } from '@/features/toast/toastStore';
import { radius, useTheme, useThemedStyles } from '@/theme';

export default function VerifyIdScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createAuthStyles);
  const auth = useAuth();
  const [photo, setPhoto] = useState<ReportPhoto | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status === 'guest') {
    return <Redirect href="/auth/sign-in" />;
  }
  const profile = auth.status === 'signedIn' ? auth.profile : null;
  if (!profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.selected} />
      </View>
    );
  }

  if (profile.verification_status === 'pending' || profile.verification_status === 'verified') {
    const verified = profile.verification_status === 'verified';
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <Icon
            name={verified ? icons.verified : icons.pending}
            size={56}
            color={verified ? colors.success : colors.warning}
          />
          <Text style={[styles.title, { textAlign: 'center' }]}>
            {verified ? 'You are verified' : 'Your ID is under review'}
          </Text>
          <Text style={[styles.infoText, { textAlign: 'center' }]}>
            {verified
              ? 'Your reports are marked as from a verified resident.'
              : 'The barangay will check your ID. You can keep reporting while you wait.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  async function handlePick(source: PhotoSource) {
    setPhotoBusy(true);
    try {
      const picked = await pickReportPhoto(source);
      if (picked) {
        setPhoto(picked);
        setError(null);
      }
    } catch (caught) {
      Alert.alert(
        'Photo not added',
        caught instanceof PhotoPermissionError
          ? 'Please allow camera access in your phone settings, or choose a photo from your gallery.'
          : 'Something went wrong while adding the photo. Please try again.',
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleSubmit() {
    if (!photo) {
      return;
    }
    setError(null);
    setSubmitting(true);
    const toastId = showToast({ tone: 'loading', message: 'Uploading your ID…', duration: 30000 });
    try {
      await submitBarangayId(photo);
    } catch (caught) {
      console.warn('Could not upload Barangay ID', caught);
      hideToast(toastId);
      setError('Your ID was not sent. Check your signal and try again.');
      setSubmitting(false);
      return;
    }
    showToast({ tone: 'success', message: 'ID sent. The barangay will review it.' });
    router.back();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Verify your residency</Text>
        <Text style={styles.subtitle}>
          Reports from verified residents are given higher priority. Only barangay staff can see
          your ID.
        </Text>

        {profile.verification_status === 'rejected' && (
          <>
            <View style={[styles.infoBanner, { backgroundColor: colors.warningSoft }]}>
              <Icon name={icons.alert} size={22} color={colors.warning} />
              <View style={styles.flex}>
                <Text style={styles.infoTitle}>Your last ID was not approved</Text>
                <Text style={styles.infoText}>
                  {profile.verification_note?.trim()
                    ? 'Read the note below, then send a new photo.'
                    : 'Send a clearer photo of your Barangay ID.'}
                </Text>
              </View>
            </View>
            {profile.verification_note?.trim() ? (
              <StaffNote note={profile.verification_note.trim()} actionNeeded />
            ) : null}
          </>
        )}

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Photo of your Barangay ID</Text>
          {photo ? (
            <>
              <Image
                source={{ uri: photo.uri }}
                style={{
                  width: '100%',
                  aspectRatio: photo.width / photo.height,
                  borderRadius: radius.md,
                }}
                accessibilityLabel="Photo of your Barangay ID"
              />
              <Pressable
                onPress={() => handlePick('camera')}
                disabled={photoBusy || submitting}
                style={styles.textButton}
                accessibilityRole="button"
              >
                <Text style={styles.link}>Retake photo</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.infoText}>
                Lay the ID flat in good light. Make sure your name and photo are readable.
              </Text>
              <PrimaryButton
                label={photoBusy ? 'Preparing photo…' : 'Take a photo'}
                icon={icons.camera}
                busy={photoBusy}
                onPress={() => handlePick('camera')}
              />
              <Pressable
                onPress={() => handlePick('library')}
                disabled={photoBusy}
                style={styles.textButton}
                accessibilityRole="button"
              >
                <Text style={styles.link}>Choose from gallery</Text>
              </Pressable>
            </>
          )}
        </View>

        <ErrorBanner message={error} />
      </ScrollView>

      {photo && (
        <View style={styles.footer}>
          <PrimaryButton
            label={submitting ? 'Sending…' : 'Send for review'}
            icon={icons.send}
            busy={submitting}
            onPress={handleSubmit}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
