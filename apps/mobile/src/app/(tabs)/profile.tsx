import { useState } from 'react';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  isProfileComplete,
  VERIFICATION_LABELS,
  type VerificationStatus,
} from '@banabaconnect/shared';
import { Icon, icons, type IconName } from '@/components/Icon';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { StaffNote } from '@/components/StaffNote';
import { avatarUrl, useAuth } from '@/features/auth/authStore';
import { signOut } from '@/features/auth/residentProfile';
import { isPhotoWaiting } from '@/features/queue/deliveryStatus';
import { reportsStore } from '@/features/queue/reportsStore';
import { requestSync } from '@/features/queue/syncEngine';
import type { QueuedReport } from '@/features/queue/types';
import { showToast } from '@/features/toast/toastStore';
import {
  setThemePreference,
  useThemePreference,
  type ThemePreference,
} from '@/features/appearance/themePreference';
import { radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const auth = useAuth();
  const profile = auth.status === 'signedIn' ? auth.profile : null;
  const status = profile?.verification_status ?? 'unverified';
  const badge = badgeTone(status, colors);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <ProfileAvatar
          uri={avatarUrl(auth)}
          size={88}
          iconSize={56}
          backgroundColor={colors.selectedSoft}
        />
        {auth.status === 'loading' ? (
          <ActivityIndicator style={styles.name} color={colors.selected} />
        ) : auth.status === 'guest' ? (
          <>
            <Text style={styles.name}>Guest</Text>
            <Text style={styles.subline}>Reporting without an account</Text>
          </>
        ) : (
          <>
            <Text style={styles.name}>
              {profile?.full_name || auth.session.user.email || 'Resident'}
            </Text>
            {profile?.area && <Text style={styles.subline}>{profile.area}</Text>}
            <View style={[styles.badge, { backgroundColor: badge.background }]}>
              <Icon name={badge.icon} size={14} color={badge.color} />
              <Text style={[styles.badgeText, { color: badge.color }]}>
                {VERIFICATION_LABELS[status]}
              </Text>
            </View>
          </>
        )}
      </View>

      {auth.status === 'guest' && (
        <ActionCard
          icon={icons.personAdd}
          title="Create a resident account"
          text="The barangay can follow up with you, and verified residents' reports get higher priority. You can still report without an account."
          actions={[
            { label: 'Create account', onPress: () => router.push('/auth/register'), primary: true },
            { label: 'Sign in', onPress: () => router.push('/auth/sign-in') },
          ]}
        />
      )}

      {auth.status === 'signedIn' && profile && !isProfileComplete(profile) && (
        <ActionCard
          icon={icons.details}
          title="Finish your registration"
          text="Add your mobile number and sitio so the barangay can reach you."
          actions={[
            { label: 'Add details', onPress: () => router.push('/auth/details'), primary: true },
          ]}
        />
      )}

      {auth.status === 'signedIn' &&
        isProfileComplete(profile) &&
        (status === 'unverified' || status === 'rejected') && (
          <ActionCard
            icon={icons.idCard}
            title={status === 'rejected' ? 'Send your ID again' : 'Verify with your Barangay ID'}
            text={
              status === 'rejected'
                ? 'Your last Barangay ID photo wasn’t approved. Send a new photo.'
                : 'Verified residents’ reports are given higher priority. Takes a minute.'
            }
            staffNote={status === 'rejected' ? profile?.verification_note : null}
            actions={[
              { label: 'Verify my ID', onPress: () => router.push('/verify-id'), primary: true },
            ]}
          />
        )}

      {status === 'pending' && auth.status === 'signedIn' && (
        <View style={styles.infoCard}>
          <Icon name={icons.pending} size={22} color={colors.warning} />
          <View style={styles.flex}>
            <Text style={styles.infoTitle}>Your ID is under review</Text>
            <Text style={styles.infoText}>
              The barangay will check it soon. You can keep reporting while you wait.
            </Text>
          </View>
        </View>
      )}

      <AppearanceSetting />

      {auth.status === 'signedIn' && <SignOutButton />}

      <Text style={styles.version}>BanabaConnect v{Constants.expoConfig?.version ?? '—'}</Text>
    </ScrollView>
  );
}

function badgeTone(status: VerificationStatus, colors: ThemeColors) {
  switch (status) {
    case 'verified':
      return { icon: icons.verified, color: colors.success, background: colors.successSoft };
    case 'pending':
      return { icon: icons.pending, color: colors.warning, background: colors.warningSoft };
    case 'rejected':
      return { icon: icons.alert, color: colors.emergencyText, background: colors.emergencySoft };
    default:
      return { icon: icons.info, color: colors.warning, background: colors.warningSoft };
  }
}

function ActionCard({
  icon,
  title,
  text,
  staffNote,
  actions,
}: {
  icon: IconName;
  title: string;
  text: string;
  /** Words from barangay staff, shown in a labeled box under the card's own text. */
  staffNote?: string | null;
  actions: { label: string; onPress: () => void; primary?: boolean }[];
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.settingCard}>
      <View style={styles.actionHeader}>
        <Icon name={icon} size={24} color={colors.primary} />
        <View style={styles.flex}>
          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoText}>{text}</Text>
          {staffNote?.trim() ? <StaffNote note={staffNote.trim()} /> : null}
        </View>
      </View>
      <View style={styles.actionRow}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.actionButton,
              action.primary && styles.actionButtonPrimary,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.actionText, action.primary && styles.actionTextPrimary]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Reports, or their photos, that haven't reached the barangay yet. */
function countNotFullySent(reports: QueuedReport[]) {
  return reports.filter((report) => report.syncStatus === 'queued' || isPhotoWaiting(report))
    .length;
}

function SignOutButton() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [checking, setChecking] = useState(false);

  function signOutNow() {
    signOut()
      .then(() => showToast({ message: 'Signed out. Your reports are saved to your account.' }))
      .catch(() => showToast({ tone: 'error', message: 'Could not sign out. Please try again.' }));
  }

  // Signing out erases this account's reports from the phone, so anything unsent would be lost.
  async function handlePress() {
    if (countNotFullySent(reportsStore.getState().reports) > 0) {
      setChecking(true);
      try {
        await requestSync({ ignoreBackoff: true });
      } finally {
        setChecking(false);
      }
    }

    const unsent = countNotFullySent(reportsStore.getState().reports);
    if (unsent > 0) {
      Alert.alert(
        unsent === 1 ? '1 report isn’t fully sent' : `${unsent} reports aren’t fully sent`,
        'Signing out deletes them from this phone, and the barangay won’t receive them. Stay signed in until you have signal and they send.',
        [
          { text: 'Stay signed in', style: 'cancel' },
          { text: 'Sign out and delete', style: 'destructive', onPress: signOutNow },
        ],
      );
      return;
    }

    Alert.alert(
      'Sign out?',
      'Your reports are saved to your account. They’re removed from this phone and come back when you sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: signOutNow },
      ],
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={checking}
      style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ busy: checking }}
    >
      {checking ? (
        <ActivityIndicator color={colors.emergencyText} />
      ) : (
        <Icon name={icons.logout} size={20} color={colors.emergencyText} />
      )}
      <Text style={styles.signOutText}>{checking ? 'Sending your reports…' : 'Sign out'}</Text>
    </Pressable>
  );
}

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Match phone', icon: icons.phoneSetting },
  { value: 'light', label: 'Light', icon: icons.lightMode },
  { value: 'dark', label: 'Dark', icon: icons.darkMode },
];

function AppearanceSetting() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const preference = useThemePreference();

  return (
    <View style={styles.settingCard}>
      <View style={styles.settingHeader}>
        <Icon name={icons.appearance} size={20} color={colors.textMuted} />
        <Text style={styles.settingTitle}>Appearance</Text>
      </View>
      <View style={styles.segments} accessibilityRole="radiogroup">
        {APPEARANCE_OPTIONS.map((option) => {
          const selected = preference === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setThemePreference(option.value)}
              style={({ pressed }) => [
                styles.segment,
                selected && styles.segmentSelected,
                pressed && styles.pressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label} appearance`}
            >
              <Icon
                name={option.icon}
                size={20}
                color={selected ? colors.onSelected : colors.textMuted}
              />
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    flex: {
      flex: 1,
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      alignItems: 'center',
      paddingVertical: 24,
    },
    name: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      marginTop: 12,
    },
    subline: {
      fontSize: 15,
      color: colors.textMuted,
      marginTop: 2,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 8,
      backgroundColor: colors.warningSoft,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    badgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.warning,
    },
    actionHeader: {
      flexDirection: 'row',
      gap: 12,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
    },
    actionButton: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    actionButtonPrimary: {
      backgroundColor: colors.primary,
    },
    actionText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    actionTextPrimary: {
      color: colors.onPrimary,
    },
    signOut: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 52,
      marginTop: 16,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    signOutText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.emergencyText,
    },
    infoCard: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: colors.selectedSoft,
      borderRadius: radius.lg,
      padding: 16,
      marginTop: 16,
    },
    infoTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    infoText: {
      fontSize: 15,
      lineHeight: 20,
      color: colors.textMuted,
      marginTop: 4,
    },
    settingCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 16,
      marginTop: 16,
    },
    settingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    segments: {
      flexDirection: 'row',
      gap: 8,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      minHeight: 64,
      paddingVertical: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    segmentSelected: {
      backgroundColor: colors.selected,
      borderColor: colors.selected,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    segmentTextSelected: {
      color: colors.onSelected,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.85,
    },
    version: {
      textAlign: 'center',
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 24,
    },
  });
}
