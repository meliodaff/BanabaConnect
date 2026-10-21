import { useState } from 'react';
import { router } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CATEGORY_LABELS } from '@banabaconnect/shared';
import { Icon, icons } from '@/components/Icon';
import { LoadingImage, Spinner } from '@/components/LoadingImage';
import { SkeletonBlock, SkeletonGroup } from '@/components/Skeleton';
import { useIsOffline } from '@/features/network/useIsOffline';
import { ReportCategoryIcon } from '@/components/ReportCategoryIcon';
import {
  deliveryStatusOf,
  formatReportTime,
  isPhotoWaiting,
} from '@/features/queue/deliveryStatus';
import { countWaiting, useQueuedReports } from '@/features/queue/reportsStore';
import { refreshStatuses } from '@/features/queue/statusSync';
import { requestSync } from '@/features/queue/syncEngine';
import { tryToSendNow } from '@/features/queue/tryToSendNow';
import { TourTarget } from '@/features/tutorial/TourTarget';
import type { QueuedReport } from '@/features/queue/types';
import { radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export default function MyReportsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { loaded, reports, sendingIds, photoDownloadIds } = useQueuedReports();
  const waiting = countWaiting(reports);
  const [refreshing, setRefreshing] = useState(false);

  // Pull down to send anything waiting and get the barangay's latest status.
  async function handleRefresh() {
    setRefreshing(true);
    try {
      await requestSync({ ignoreBackoff: true });
      await refreshStatuses({ force: true });
    } finally {
      setRefreshing(false);
    }
  }

  if (!loaded) {
    return (
      <View style={styles.screen}>
        <SkeletonGroup style={styles.listContent}>
          <SkeletonBlock width={110} height={15} style={styles.monthSkeleton} />
          {[0, 1, 2, 3].map((key) => (
            <ReportCardSkeleton key={key} />
          ))}
        </SkeletonGroup>
      </View>
    );
  }

  const sections = groupByMonth(reports);

  return (
    <SectionList
      style={styles.screen}
      contentContainerStyle={reports.length === 0 ? styles.emptyContent : styles.listContent}
      sections={sections}
      keyExtractor={(item) => item.submission.id}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <View style={[styles.monthHeader, section !== sections[0] && styles.monthHeaderSpaced]}>
          <Text style={styles.monthTitle} accessibilityRole="header">
            {section.title}
          </Text>
          <Text style={styles.monthCount}>
            {section.data.length === 1 ? '1 report' : `${section.data.length} reports`}
          </Text>
        </View>
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      ListHeaderComponent={waiting > 0 ? <WaitingSummary count={waiting} /> : null}
      ListEmptyComponent={<EmptyState />}
      renderItem={({ item, index, section }) => {
        const card = (
          <ReportCard
            report={item}
            sending={sendingIds.has(item.submission.id)}
            photoDownloading={photoDownloadIds.has(item.submission.id)}
          />
        );
        // The tutorial points at the newest report.
        return section === sections[0] && index === 0 ? (
          <TourTarget id="reports-first">{card}</TourTarget>
        ) : (
          card
        );
      }}
    />
  );
}

interface MonthSection {
  title: string;
  data: QueuedReport[];
}

/** Splits the newest-first list into one section per month, e.g. "October 2026". */
function groupByMonth(reports: QueuedReport[]): MonthSection[] {
  const sections: MonthSection[] = [];
  for (const report of reports) {
    const title = new Date(report.submission.createdAt).toLocaleString('en-PH', {
      month: 'long',
      year: 'numeric',
    });
    const last = sections[sections.length - 1];
    if (last?.title === title) {
      last.data.push(report);
    } else {
      sections.push({ title, data: [report] });
    }
  }
  return sections;
}

function WaitingSummary({ count }: { count: number }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const offline = useIsOffline();
  return (
    <View style={styles.summary}>
      <Icon name={icons.queued} size={24} color={colors.warning} />
      <View style={styles.flex}>
        <Text style={styles.summaryTitle}>
          {`${count} report ang naghihintay ng signal`}
        </Text>
        <Text style={styles.summaryText}>
          Naka-save po sa phone mo. Kusang maipapadala kapag may signal na.
        </Text>
      </View>
      <Pressable
        onPress={() => tryToSendNow(offline)}
        hitSlop={8}
        accessibilityRole="button"
      >
        <Text style={styles.link}>Subukan ngayon</Text>
      </Pressable>
    </View>
  );
}

function ReportCard({
  report,
  sending,
  photoDownloading,
}: {
  report: QueuedReport;
  sending: boolean;
  /** The photo is still on its way from the server (right after signing in). */
  photoDownloading: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { submission, photo } = report;
  const status = deliveryStatusOf(report, sending, colors);
  const photoWaiting = isPhotoWaiting(report);
  const categoryThumbnail = (
    <ReportCategoryIcon category={submission.category} size={28} style={[styles.thumbnail, styles.iconThumbnail]} />
  );

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/reports/[id]', params: { id: submission.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${CATEGORY_LABELS[submission.category]} report, ${status.label}${
        report.syncStatus === 'sent' && report.serverNote ? ', has a note from barangay staff' : ''
      }${!photo && photoDownloading ? ', photo downloading' : ''}`}
      accessibilityHint="Opens the report details"
    >
      {photo ? (
        <LoadingImage uri={photo.uri} style={styles.thumbnail} fallback={categoryThumbnail} />
      ) : photoDownloading ? (
        <View style={[styles.thumbnail, { backgroundColor: colors.categoryTint }]}>
          <Spinner />
        </View>
      ) : (
        categoryThumbnail
      )}
      <View style={styles.flex}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {CATEGORY_LABELS[submission.category]}
          </Text>
          <Text style={styles.cardTime}>{formatReportTime(submission.createdAt)}</Text>
        </View>
        {submission.description.length > 0 && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {submission.description}
          </Text>
        )}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: status.background, borderColor: status.border },
            ]}
          >
            <Icon name={status.icon} size={14} color={status.iconColor} />
            <Text style={[styles.statusText, { color: status.textColor }]}>{status.label}</Text>
          </View>
          {photoWaiting && <Text style={styles.photoNote}>Ipinapadala pa ang litrato</Text>}
        </View>
        {report.syncStatus === 'sent' && report.serverNote && (
          <NotePreview note={report.serverNote} closed={report.serverStatus === 'invalid'} />
        )}
      </View>
      <View style={styles.chevron}>
        <Icon name={icons.chevron} size={22} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

/**
 * A quoted preview of the staff's message, shaped like a message (full width, accent bar, the
 * words themselves) so it can't be mistaken for a status pill. Amber for a closed report and blue
 * otherwise, matching the full notice on the details screen.
 */
function NotePreview({ note, closed }: { note: string; closed: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const accent = closed ? colors.warning : colors.primary;
  return (
    <View
      style={[
        styles.notePreview,
        { borderLeftColor: accent, backgroundColor: closed ? colors.warningSoft : colors.background },
      ]}
    >
      <View style={styles.notePreviewHeader}>
        <Icon name={icons.barangay} size={13} color={accent} />
        <Text style={[styles.notePreviewLabel, { color: accent }]}>
          Message from Barangay Banaba
        </Text>
      </View>
      <Text style={styles.notePreviewText} numberOfLines={2}>
        {note}
      </Text>
    </View>
  );
}

/** Same layout as ReportCard, shown while the reports load from the phone. */
function ReportCardSkeleton() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      <SkeletonBlock width={64} height={64} radius={radius.md} />
      <View style={styles.flex}>
        <View style={styles.cardTop}>
          <SkeletonBlock width="45%" height={18} />
          <View style={styles.flex} />
          <SkeletonBlock width={56} height={12} />
        </View>
        <SkeletonBlock width="100%" height={14} style={styles.skeletonLine} />
        <SkeletonBlock width="70%" height={14} style={styles.skeletonLine} />
        <View style={styles.statusRow}>
          <SkeletonBlock width={96} height={26} radius={radius.pill} />
        </View>
      </View>
    </View>
  );
}

function EmptyState() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.empty}>
      <TourTarget id="reports-empty" style={styles.emptyIntro}>
        <View style={styles.emptyIcon}>
          <Icon name={icons.reports} size={44} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No reports yet</Text>
        <Text style={styles.emptyMessage}>
          Reports you send will appear here, even ones still waiting for signal.
        </Text>
      </TourTarget>
      <Pressable
        onPress={() => router.push('/report')}
        style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Text style={styles.emptyButtonText}>Report an emergency</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      padding: 16,
      gap: 12,
    },
    emptyContent: {
      flexGrow: 1,
      padding: 16,
    },
    flex: {
      flex: 1,
    },
    monthHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    /** Extra room above every month after the first, so each group reads as its own block. */
    monthHeaderSpaced: {
      paddingTop: 12,
    },
    monthTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    monthCount: {
      fontSize: 13,
      color: colors.textMuted,
    },
    monthSkeleton: {
      marginHorizontal: 4,
      marginVertical: 2,
    },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.warningBorder,
      padding: 14,
    },
    summaryTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    summaryText: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      marginTop: 2,
    },
    link: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primary,
    },
    card: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 12,
    },
    chevron: {
      justifyContent: 'center',
    },
    thumbnail: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      backgroundColor: colors.background,
    },
    iconThumbnail: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
    },
    cardTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    cardTime: {
      fontSize: 12,
      color: colors.textMuted,
    },
    cardDescription: {
      fontSize: 14,
      lineHeight: 19,
      color: colors.textMuted,
      marginTop: 2,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    statusPill: {
      maxWidth: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusText: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: '700',
    },
    skeletonLine: {
      marginTop: 6,
    },
    photoNote: {
      fontSize: 13,
      color: colors.textMuted,
    },
    notePreview: {
      marginTop: 10,
      borderLeftWidth: 3,
      borderRadius: radius.sm,
      paddingVertical: 8,
      paddingHorizontal: 10,
      gap: 3,
    },
    notePreviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    notePreviewLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    notePreviewText: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    emptyIntro: {
      alignItems: 'center',
    },
    emptyIcon: {
      width: 96,
      height: 96,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    emptyMessage: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 24,
    },
    emptyButton: {
      backgroundColor: colors.emergency,
      borderRadius: radius.md,
      paddingVertical: 14,
      paddingHorizontal: 24,
    },
    emptyButtonText: {
      color: colors.onEmergency,
      fontSize: 16,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
