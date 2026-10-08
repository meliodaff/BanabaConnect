import { useState } from 'react';
import {
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
import { router } from 'expo-router';
import {
  CATEGORY_LABELS,
  DESCRIPTION_MAX_LENGTH,
  REPORT_CATEGORIES,
  type ReportCategory,
} from '@banabaconnect/shared';
import { colors } from '@/theme';
import { buildSubmission, INCIDENT_TIME_OPTIONS } from '@/features/report/buildSubmission';
import {
  PhotoPermissionError,
  pickReportPhoto,
  type PhotoSource,
  type ReportPhoto,
} from '@/features/report/photo';
import { useReportLocation, type LocationState } from '@/features/report/useReportLocation';

export default function ReportScreen() {
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');
  const [minutesAgo, setMinutesAgo] = useState<number>(0);
  const [photo, setPhoto] = useState<ReportPhoto | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const { location, retryLocation } = useReportLocation();

  const canSubmit = category !== null && location.coords !== null && !photoBusy;

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
          ? 'Allow camera access in your phone settings to take a photo.'
          : 'Something went wrong while adding the photo. Please try again.',
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  function handleSubmit() {
    if (category === null || location.coords === null) {
      return;
    }
    const submission = buildSubmission({
      category,
      coords: location.coords,
      description,
      minutesAgo,
    });

    // TODO: save to the offline queue (SQLite) instead of only showing it.
    console.log('Report ready', submission, photo);
    Alert.alert('Report ready', `${CATEGORY_LABELS[submission.category]} report created.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <Text style={styles.label}>What is happening?</Text>
        <View style={styles.chipGrid}>
          {REPORT_CATEGORIES.map((value) => (
            <Chip
              key={value}
              label={CATEGORY_LABELS[value]}
              selected={category === value}
              onPress={() => setCategory(value)}
            />
          ))}
        </View>

        <Text style={styles.label}>Location</Text>
        <LocationCard location={location} onRetry={retryLocation} />

        <Text style={styles.label}>Photo (optional)</Text>
        {photo ? (
          <View>
            <Image
              source={{ uri: photo.uri }}
              style={[styles.photo, { aspectRatio: photo.width / photo.height }]}
              accessibilityLabel="Photo of the incident"
            />
            <Pressable onPress={() => setPhoto(null)} style={styles.linkButton}>
              <Text style={styles.linkButtonText}>Remove photo</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.row}>
            <SecondaryButton
              label={photoBusy ? 'Processing…' : 'Take photo'}
              disabled={photoBusy}
              onPress={() => handlePickPhoto('camera')}
            />
            <SecondaryButton
              label="From gallery"
              disabled={photoBusy}
              onPress={() => handlePickPhoto('library')}
            />
          </View>
        )}

        <Text style={styles.label}>Details (optional)</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Water is knee-deep near the chapel, two families need help"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={DESCRIPTION_MAX_LENGTH}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>
          {description.length}/{DESCRIPTION_MAX_LENGTH}
        </Text>

        <Text style={styles.label}>When did it happen?</Text>
        <View style={styles.chipGrid}>
          {INCIDENT_TIME_OPTIONS.map((option) => (
            <Chip
              key={option.minutesAgo}
              label={option.label}
              selected={minutesAgo === option.minutesAgo}
              onPress={() => setMinutesAgo(option.minutesAgo)}
            />
          ))}
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.submitButton,
            !canSubmit && styles.submitButtonDisabled,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
        >
          <Text style={styles.submitButtonText}>Send report</Text>
        </Pressable>
        {!canSubmit && (
          <Text style={styles.hint}>
            {category === null ? 'Choose what is happening to continue.' : 'Waiting for your location…'}
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LocationCard({ location, onRetry }: { location: LocationState; onRetry: () => void }) {
  let message: string;
  let tone: string;
  switch (location.status) {
    case 'ready':
      message = formatAccuracy(location.coords.accuracy, 'Location found');
      tone = colors.success;
      break;
    case 'locating':
      message = location.coords
        ? formatAccuracy(location.coords.accuracy, 'Approximate location found, improving')
        : 'Getting your location…';
      tone = colors.warning;
      break;
    case 'denied':
      message = 'Location permission is off. The barangay needs your location to send help.';
      tone = colors.emergency;
      break;
    case 'error':
      message = 'Could not get your location. Move near a window or outdoors and try again.';
      tone = colors.emergency;
      break;
  }

  return (
    <View style={[styles.card, { borderLeftColor: tone }]}>
      <Text style={styles.cardText}>{message}</Text>
      {(location.status === 'denied' || location.status === 'error') && (
        <Pressable onPress={onRetry} style={styles.linkButton}>
          <Text style={styles.linkButtonText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

function formatAccuracy(accuracy: number | null, prefix: string) {
  return accuracy === null ? prefix : `${prefix} (within ${Math.round(accuracy)} m)`;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <Text style={[styles.secondaryButtonText, disabled && { color: colors.disabled }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.background,
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
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 12,
  },
  cardText: {
    fontSize: 15,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.selected,
  },
  photo: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.selected,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 15,
    color: colors.text,
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  submitButton: {
    marginTop: 32,
    backgroundColor: colors.emergency,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  submitButtonText: {
    color: colors.onEmergency,
    fontSize: 18,
    fontWeight: '700',
  },
  hint: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.85,
  },
});
