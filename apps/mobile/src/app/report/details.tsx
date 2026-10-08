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
  REPORT_CATEGORIES,
  type ReportCategory,
} from '@banabaconnect/shared';
import { Icon, icons, type IconName } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { buildSubmission, INCIDENT_TIME_OPTIONS } from '@/features/report/buildSubmission';
import { CATEGORY_APPEARANCE } from '@/features/report/categoryAppearance';
import { OFFLINE_REPORT_MESSAGE, OFFLINE_REPORT_TITLE } from '@/features/report/messages';
import { saveReport } from '@/features/queue/reportRepository';
import { reportsStore } from '@/features/queue/reportsStore';
import { requestSync } from '@/features/queue/syncEngine';
import {
  PhotoPermissionError,
  pickReportPhoto,
  type PhotoSource,
  type ReportPhoto,
} from '@/features/report/photo';
import { useReportLocation, type LocationState } from '@/features/report/useReportLocation';
import { colors, radius } from '@/theme';

function isReportCategory(value: unknown): value is ReportCategory {
  return typeof value === 'string' && (REPORT_CATEGORIES as readonly string[]).includes(value);
}

export default function ReportDetailsScreen() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  if (!isReportCategory(category)) {
    return <Redirect href="/report" />;
  }
  return <ReportDetailsForm category={category} />;
}

function ReportDetailsForm({ category }: { category: ReportCategory }) {
  const [description, setDescription] = useState('');
  const [minutesAgo, setMinutesAgo] = useState<number>(0);
  const [photo, setPhoto] = useState<ReportPhoto | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const { location, retryLocation } = useReportLocation();
  const look = CATEGORY_APPEARANCE[category];

  const [saving, setSaving] = useState(false);
  const canSend = location.coords !== null && !photoBusy && !saving;

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

  async function handleSend() {
    if (location.coords === null) {
      return;
    }
    const submission = buildSubmission({
      category,
      coords: location.coords,
      description,
      minutesAgo,
    });

    setSaving(true);
    try {
      // Save on the phone first, so the report survives no signal, app closes, and restarts.
      await saveReport(submission, photo);
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

          <OfflineBanner title={OFFLINE_REPORT_TITLE} message={OFFLINE_REPORT_MESSAGE} />

          <View style={styles.categoryRow}>
            <View style={[styles.categoryIcon, { backgroundColor: look.tint }]}>
              <Icon name={look.icon} size={26} color={look.color} />
            </View>
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
                  <Pressable onPress={() => setPhoto(null)} hitSlop={8}>
                    <Text style={[styles.link, { color: colors.emergency }]}>Remove</Text>
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
            <Icon name={icons.send} size={22} color={colors.onEmergency} />
            <Text style={styles.sendButtonText}>{saving ? 'Saving…' : 'Send report'}</Text>
          </Pressable>
          {!canSend && !saving && (
            <Text style={styles.footerHint}>
              {photoBusy ? 'Preparing your photo…' : 'We need your location before sending.'}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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

function LocationBanner({ location, onRetry }: { location: LocationState; onRetry: () => void }) {
  let icon: IconName;
  let title: string;
  let detail: string;
  let tone: { color: string; background: string };
  let action: string | null = null;

  switch (location.status) {
    case 'ready':
      icon = icons.check;
      title = 'Location found';
      detail = formatAccuracy(location.coords.accuracy) ?? 'Responders will see where you are.';
      tone = { color: colors.success, background: colors.successSoft };
      break;
    case 'approximate':
      icon = icons.location;
      title = 'Using your last known location';
      detail = 'We could not get a fresh GPS fix. Step outside or near a window, then try again.';
      tone = { color: colors.warning, background: colors.warningSoft };
      action = 'Try again';
      break;
    case 'locating':
      icon = icons.locating;
      title = 'Finding your location…';
      detail = location.coords
        ? 'Almost there, improving accuracy.'
        : 'This can take a few seconds. Keep this screen open.';
      tone = { color: colors.warning, background: colors.warningSoft };
      break;
    case 'denied':
      icon = icons.locationOff;
      title = 'Location permission needed';
      detail = location.canAskAgain
        ? 'The barangay needs your location to send help.'
        : 'Open Settings, tap Permissions, then Location, and choose "Allow". Then come back here.';
      tone = { color: colors.emergency, background: colors.emergencySoft };
      action = location.canAskAgain ? 'Allow' : 'Open settings';
      break;
    case 'servicesOff':
      icon = icons.locationOff;
      title = "Your phone's location is off";
      detail = 'Turn on Location so the barangay can find you.';
      tone = { color: colors.emergency, background: colors.emergencySoft };
      action = Platform.OS === 'android' ? 'Turn on' : 'Open settings';
      break;
    case 'error':
      icon = icons.locationOff;
      title = 'Could not find your location';
      detail = 'Step outside or near a window, then try again.';
      tone = { color: colors.emergency, background: colors.emergencySoft };
      action = 'Try again';
      break;
  }

  return (
    <View
      style={[styles.banner, { backgroundColor: tone.background }]}
      accessibilityLiveRegion="polite"
    >
      {location.status === 'locating' ? (
        <ActivityIndicator color={tone.color} />
      ) : (
        <Icon name={icon} size={24} color={tone.color} />
      )}
      <View style={styles.flex}>
        <Text style={[styles.bannerTitle, { color: tone.color }]}>{title}</Text>
        <Text style={styles.bannerDetail}>{detail}</Text>
      </View>
      {action && (
        <Pressable onPress={onRetry} hitSlop={12} accessibilityRole="button">
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function formatAccuracy(accuracy: number | null) {
  return accuracy === null ? null : `Accurate to about ${Math.round(accuracy)} meters.`;
}

const styles = StyleSheet.create({
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    padding: 14,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  bannerDetail: {
    fontSize: 14,
    color: colors.text,
    marginTop: 2,
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
