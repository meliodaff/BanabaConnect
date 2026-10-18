import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CATEGORY_LABELS,
  DESCRIPTION_MAX_LENGTH,
  isOutsideBanaba,
  PICKER_CATEGORIES,
  type ReportCategory,
  type ReportSubmission,
} from '@banabaconnect/shared';
import { Icon, icons, type IconName } from '@/components/Icon';
import { LocationBanner } from '@/components/LocationBanner';
import { callNumber, NATIONAL_EMERGENCY_NUMBER } from '@/features/hotlines/call';
import { useIsOffline } from '@/features/network/useIsOffline';
import { buildSubmission, INCIDENT_TIME_OPTIONS } from '@/features/report/buildSubmission';
import { CATEGORY_APPEARANCE } from '@/features/report/categoryAppearance';
import { ReportCategoryIcon } from '@/components/ReportCategoryIcon';
import { findRecentDuplicate } from '@/features/report/recentDuplicate';
import { currentReportOwner } from '@/features/auth/guestSession';
import { saveReport } from '@/features/queue/reportRepository';
import { reportsStore } from '@/features/queue/reportsStore';
import { requestSync } from '@/features/queue/syncEngine';
import { showToast } from '@/features/toast/toastStore';
import {
  PhotoPermissionError,
  pickReportPhoto,
  type PhotoSource,
  type ReportPhoto,
} from '@/features/report/photo';
import { useReportLocation, type LocationState } from '@/features/report/useReportLocation';
import { radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

/** One of the form's categories. SOS has its own one-tap screen, so it isn't accepted here. */
function isReportCategory(value: unknown): value is ReportCategory {
  return typeof value === 'string' && (PICKER_CATEGORIES as readonly string[]).includes(value);
}

export default function ReportDetailsScreen() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  if (!isReportCategory(category)) {
    return <Redirect href="/report" />;
  }
  return <ReportDetailsForm category={category} />;
}

function ReportDetailsForm({ category }: { category: ReportCategory }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [description, setDescription] = useState('');
  const [minutesAgo, setMinutesAgo] = useState<number>(0);
  const [photo, setPhoto] = useState<ReportPhoto | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const { location, retryLocation } = useReportLocation();
  const look = CATEGORY_APPEARANCE[category];

  const [saving, setSaving] = useState(false);
  const offline = useIsOffline();
  const canSend = location.coords !== null && !photoBusy && !saving;
  const sendState = describeSendState({ location, photoBusy, saving, offline });

  async function handlePickPhoto(source: PhotoSource) {
    setPhotoBusy(true);
    try {
      const picked = await pickReportPhoto(source);
      if (picked) {
        setPhoto(picked);
      }
    } catch (error) {
      Alert.alert(
        'Photo not added',
        error instanceof PhotoPermissionError
          ? 'Please allow camera access in your phone settings, or choose a photo from your gallery.'
          : 'Something went wrong while adding the photo. Please try again.',
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  function handleRemovePhoto(removed: ReportPhoto) {
    setPhoto(null);
    showToast({
      message: 'Photo removed.',
      icon: icons.gallery,
      action: { label: 'Undo', onPress: () => setPhoto(removed) },
    });
  }

  function handleSend() {
    if (location.coords === null) {
      return;
    }
    const submission = buildSubmission({
      category,
      coords: location.coords,
      description,
      minutesAgo,
    });
    confirmInsideBanaba(submission);
  }

  // The barangay only handles Banaba, so say so before sending from somewhere else. Never block
  // it: the GPS can be off, and the barangay can pass a nearby emergency on. The same rule flags
  // the report "Outside Banaba" on the dashboard (submit_report).
  function confirmInsideBanaba(submission: ReportSubmission) {
    const point: [number, number] = [submission.longitude, submission.latitude];
    if (!isOutsideBanaba(point, submission.locationAccuracy)) {
      confirmNotDuplicate(submission);
      return;
    }
    Alert.alert(
      'You seem to be outside Barangay Banaba',
      'BanabaConnect sends reports to the Barangay Banaba hall. If this emergency is somewhere else, call 911 instead.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Call ${NATIONAL_EMERGENCY_NUMBER}`,
          onPress: () => callNumber(NATIONAL_EMERGENCY_NUMBER),
        },
        { text: 'Send to Banaba anyway', onPress: () => confirmNotDuplicate(submission) },
      ],
    );
  }

  // Ask before a likely accidental repeat, but never block it: a second report can carry news.
  function confirmNotDuplicate(submission: ReportSubmission) {
    const duplicate = findRecentDuplicate(submission, reportsStore.getState().reports);
    if (!duplicate) {
      void saveAndSend(submission);
      return;
    }
    const minutes = Math.max(1, Math.round(duplicate.minutesAgo));
    Alert.alert(
      'You already reported this',
      `You sent a report near here ${minutes === 1 ? '1 minute' : `${minutes} minutes`} ago (${
        CATEGORY_LABELS[category]
      }). Send another one only if there's something new, like it's getting worse.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'See my report',
          // Pushed, not replaced: Back returns to this form with everything still filled in,
          // in case the resident decides there's something new to send after all.
          onPress: () =>
            router.push({
              pathname: '/reports/[id]',
              params: { id: duplicate.report.submission.id },
            }),
        },
        { text: 'Send anyway', onPress: () => void saveAndSend(submission) },
      ],
    );
  }

  async function saveAndSend(submission: ReportSubmission) {
    setSaving(true);
    try {
      // Save on the phone first, so the report survives no signal, app closes, and restarts.
      await saveReport(submission, photo, await currentReportOwner());
      await reportsStore.refresh();
    } catch (error) {
      console.warn('Could not save report', error);
      setSaving(false);
      Alert.alert(
        'Report not saved',
        'Something went wrong while saving your report. Please try again. If it is urgent, call a hotline.',
      );
      return;
    }
    requestSync();
    router.replace({ pathname: '/report/sent', params: { id: submission.id } });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.step}>Step 2 of 2</Text>
          <Text style={styles.title}>Add details</Text>

          <View style={styles.categoryRow}>
            <ReportCategoryIcon category={category} size={26} style={styles.categoryIcon} />
            <View style={styles.flex}>
              <Text style={styles.categoryLabel}>{CATEGORY_LABELS[category]}</Text>
              <Text style={styles.categoryTagalog}>{look.tagalog}</Text>
            </View>
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
              <Text style={styles.link}>Change</Text>
            </Pressable>
          </View>

          <LocationBanner location={location} onRetry={retryLocation} />

          <Section icon={icons.camera} title="Photo" hint="Optional">
            {photo ? (
              <View>
                <Image
                  source={{ uri: photo.uri }}
                  style={[styles.photo, { aspectRatio: photo.width / photo.height }]}
                  accessibilityLabel="Photo of the incident"
                />
                <View style={styles.photoActions}>
                  <Pressable onPress={() => handlePickPhoto('camera')} hitSlop={8}>
                    <Text style={styles.link}>Retake</Text>
                  </Pressable>
                  <Pressable onPress={() => handleRemovePhoto(photo)} hitSlop={8}>
                    <Text style={[styles.link, { color: colors.emergencyText }]}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => handlePickPhoto('camera')}
                  disabled={photoBusy}
                  style={({ pressed }) => [styles.photoDrop, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  {photoBusy ? (
                    <ActivityIndicator color={colors.selected} />
                  ) : (
                    <Icon name={icons.camera} size={34} color={colors.selected} />
                  )}
                  <Text style={styles.photoDropText}>
                    {photoBusy ? 'Preparing photo…' : 'Tap to take a photo'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handlePickPhoto('library')}
                  disabled={photoBusy}
                  style={styles.galleryButton}
                  hitSlop={8}
                >
                  <Icon name={icons.gallery} size={18} color={colors.selected} />
                  <Text style={styles.link}>Choose from gallery</Text>
                </Pressable>
              </>
            )}
          </Section>

          <Section icon={icons.details} title="What do you see?" hint="Optional">
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder={look.placeholder}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={DESCRIPTION_MAX_LENGTH}
              textAlignVertical="top"
            />
            <Text style={styles.counter}>
              {description.length}/{DESCRIPTION_MAX_LENGTH}
            </Text>
          </Section>

          <Section icon={icons.time} title="When did it happen?">
            <View style={styles.chips}>
              {INCIDENT_TIME_OPTIONS.map((option) => {
                const selected = minutesAgo === option.minutesAgo;
                return (
                  <Pressable
                    key={option.minutesAgo}
                    onPress={() => setMinutesAgo(option.minutesAgo)}
                    style={[styles.chip, selected && styles.chipSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendButton,
              !canSend && styles.sendButtonDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSend }}
          >
            {sendState.busy ? (
              <ActivityIndicator color={colors.onEmergency} />
            ) : (
              canSend && <Icon name={icons.send} size={22} color={colors.onEmergency} />
            )}
            <Text style={styles.sendButtonText}>{sendState.label}</Text>
          </Pressable>
          {sendState.hint && <Text style={styles.footerHint}>{sendState.hint}</Text>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** What the Send button says, and why it can't be pressed yet. */
function describeSendState({
  location,
  photoBusy,
  saving,
  offline,
}: {
  location: LocationState;
  photoBusy: boolean;
  saving: boolean;
  offline: boolean;
}): { label: string; hint: string | null; busy: boolean } {
  if (saving) {
    return { label: 'Saving…', hint: null, busy: true };
  }
  if (photoBusy) {
    return { label: 'Preparing photo…', hint: null, busy: true };
  }
  if (location.coords === null) {
    return location.status === 'locating'
      ? {
          label: 'Finding your location…',
          hint: 'You can send as soon as your location is found.',
          busy: true,
        }
      : { label: 'Location needed', hint: 'Turn on location above to send your report.', busy: false };
  }
  if (offline) {
    return {
      label: 'Save and send later',
      hint: 'No signal. Saved on your phone and sent automatically when you get signal.',
      busy: false,
    };
  }
  return { label: 'Send report', hint: null, busy: false };
}

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: IconName;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name={icon} size={20} color={colors.textMuted} />
        <Text style={styles.sectionTitle}>{title}</Text>
        {hint && <Text style={styles.sectionHint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: 20,
      paddingBottom: 32,
      gap: 16,
    },
    step: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.selected,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      marginTop: -12,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 14,
    },
    categoryIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryLabel: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    categoryTagalog: {
      fontSize: 13,
      color: colors.textMuted,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    sectionTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    sectionHint: {
      fontSize: 13,
      color: colors.textMuted,
    },
    photoDrop: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.selected,
      backgroundColor: colors.selectedSoft,
      borderRadius: radius.md,
      paddingVertical: 28,
      alignItems: 'center',
      gap: 8,
    },
    photoDropText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.selected,
    },
    galleryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 12,
    },
    photo: {
      width: '100%',
      borderRadius: radius.md,
      backgroundColor: colors.background,
    },
    photoActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    link: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.selected,
    },
    textArea: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: 12,
      minHeight: 100,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
    },
    counter: {
      alignSelf: 'flex-end',
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
    },
    chipSelected: {
      backgroundColor: colors.selected,
      borderColor: colors.selected,
    },
    chipText: {
      fontSize: 15,
      color: colors.text,
    },
    chipTextSelected: {
      color: colors.onSelected,
      fontWeight: '700',
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    sendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.emergency,
      borderRadius: radius.md,
      paddingVertical: 18,
    },
    sendButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    sendButtonText: {
      color: colors.onEmergency,
      fontSize: 18,
      fontWeight: '800',
    },
    footerHint: {
      textAlign: 'center',
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 8,
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
