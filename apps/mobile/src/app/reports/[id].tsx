import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORY_LABELS } from '@banabaconnect/shared';
import { Icon, icons, type IconName } from '@/components/Icon';
import { StaffNote } from '@/components/StaffNote';
import { callNumber, NATIONAL_EMERGENCY_NUMBER } from '@/features/hotlines/call';
import {
  deliveryStatusDetail,
  deliveryStatusOf,
  formatReportTime,
  isPhotoWaiting,
} from '@/features/queue/deliveryStatus';
import { useQueuedReports } from '@/features/queue/reportsStore';
import { useIsOffline } from '@/features/network/useIsOffline';
import { tryToSendNow } from '@/features/queue/tryToSendNow';
import type { QueuedReport } from '@/features/queue/types';
import { CATEGORY_APPEARANCE } from '@/features/report/categoryAppearance';
import { radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export default function ReportDetailScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { loaded, reports, sendingIds } = useQueuedReports();
  const report = reports.find((r) => r.submission.id === id);

  if (!loaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centered}>
        <Text style={styles.missingTitle}>Report not found</Text>
        <Text style={styles.missingText}>It is no longer saved on this phone.</Text>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Text style={styles.link}>Back to my reports</Text>
        </Pressable>
      </View>
    );
  }

  return <ReportDetail report={report} sending={sendingIds.has(report.submission.id)} />;
}

function ReportDetail({ report, sending }: { report: QueuedReport; sending: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { submission, photo } = report;
  const look = CATEGORY_APPEARANCE[submission.category];
  const status = deliveryStatusOf(report, sending, colors);
  const sent = report.syncStatus === 'sent';
  const offline = useIsOffline();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.categoryRow}>
          <View style={[styles.categoryIcon, { backgroundColor: colors.categoryTint }]}>
            <Icon name={look.icon} size={26} color={colors.categoryIcon} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.categoryLabel}>{CATEGORY_LABELS[submission.category]}</Text>
            <Text style={styles.categoryTagalog}>{look.tagalog}</Text>
          </View>
        </View>

        <View
          style={[styles.status, { backgroundColor: status.background, borderColor: status.border }]}
        >
          {sending ? (
            <ActivityIndicator color={status.iconColor} />
          ) : (
            <Icon name={status.icon} size={24} color={status.iconColor} />
          )}
          <View style={styles.flex}>
            <Text style={[styles.statusTitle, { color: status.textColor }]}>{status.label}</Text>
            <Text style={styles.statusText}>{deliveryStatusDetail(report)}</Text>
          </View>
          {!sent && !sending && (
            <Pressable
              onPress={() => tryToSendNow(offline)}
              hitSlop={12}
              accessibilityRole="button"
            >
              <Text style={styles.link}>Try now</Text>
            </Pressable>
          )}
        </View>

        {sent && report.serverNote && <StaffNote note={report.serverNote} />}

        {!sent && (
          <Pressable
            onPress={() => callNumber(NATIONAL_EMERGENCY_NUMBER)}
            style={({ pressed }) => [styles.callTip, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Call ${NATIONAL_EMERGENCY_NUMBER}`}
          >
            <Icon name={icons.phone} size={22} color={colors.emergencyText} />
            <View style={styles.flex}>
              <Text style={styles.callTitle}>
                Someone in danger now? Call {NATIONAL_EMERGENCY_NUMBER}
              </Text>
              <Text style={styles.callText}>Calls work without internet.</Text>
            </View>
          </Pressable>
        )}

        {photo && (
          <View style={styles.section}>
            <SectionHeader icon={icons.camera} title="Photo" />
            <Image
              source={{ uri: photo.uri }}
              style={[styles.photo, { aspectRatio: photo.width / photo.height }]}
              accessibilityLabel="Photo of the incident"
            />
            {isPhotoWaiting(report) && (
              <Text style={styles.note}>
                Photo still uploading. It sends automatically when you get signal.
              </Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader icon={icons.details} title="What you saw" />
          <Text style={submission.description ? styles.body : styles.muted}>
            {submission.description || 'No description added.'}
          </Text>
        </View>

        <View style={styles.section}>
          <SectionHeader icon={icons.time} title="Time" />
          <Row label="Happened" value={formatReportTime(submission.incidentAt)} />
          <Row label="Reported" value={formatReportTime(submission.createdAt)} />
          {sent && report.sentAt && <Row label="Sent" value={formatReportTime(report.sentAt)} />}
        </View>

        <View style={styles.section}>
          <SectionHeader icon={icons.location} title="Location" />
          <Text style={styles.body}>
            {submission.latitude.toFixed(5)}, {submission.longitude.toFixed(5)}
          </Text>
          {submission.locationAccuracy !== null && (
            <Text style={styles.muted}>
              Accurate to about {Math.round(submission.locationAccuracy)} meters.
            </Text>
          )}
          <Pressable
            onPress={() => openInMaps(submission.latitude, submission.longitude)}
            style={styles.mapButton}
            hitSlop={8}
            accessibilityRole="link"
          >
            <Icon name={icons.location} size={18} color={colors.primary} />
            <Text style={styles.link}>Open in Maps</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

async function openInMaps(latitude: number, longitude: number) {
  try {
    await Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    );
  } catch {
    Alert.alert('Could not open Maps', 'Check that a maps or browser app is installed.');
  }
}

function SectionHeader({ icon, title }: { icon: IconName; title: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={20} color={colors.textMuted} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 24,
      backgroundColor: colors.background,
    },
    missingTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    missingText: {
      fontSize: 15,
      color: colors.textMuted,
      marginBottom: 12,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
      gap: 12,
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
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    categoryTagalog: {
      fontSize: 13,
      color: colors.textMuted,
    },
    status: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: 14,
    },
    statusTitle: {
      fontSize: 15,
      fontWeight: '700',
    },
    statusText: {
      fontSize: 14,
      lineHeight: 19,
      color: colors.text,
      marginTop: 2,
    },
    callTip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.emergencySoft,
      borderRadius: radius.lg,
      padding: 14,
    },
    callTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.emergencyText,
    },
    callText: {
      fontSize: 13,
      color: colors.textMuted,
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
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    photo: {
      width: '100%',
      borderRadius: radius.md,
      backgroundColor: colors.background,
    },
    note: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 8,
    },
    body: {
      fontSize: 16,
      lineHeight: 23,
      color: colors.text,
    },
    muted: {
      fontSize: 15,
      lineHeight: 21,
      color: colors.textMuted,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    rowLabel: {
      fontSize: 15,
      color: colors.textMuted,
    },
    rowValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    mapButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
    },
    link: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primary,
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
