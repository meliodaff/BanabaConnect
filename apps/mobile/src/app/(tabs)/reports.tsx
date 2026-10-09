import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CATEGORY_LABELS } from '@banabaconnect/shared';
import { Icon, icons } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { CATEGORY_APPEARANCE } from '@/features/report/categoryAppearance';
import {
  deliveryStatusOf,
  formatReportTime,
  isPhotoWaiting,
} from '@/features/queue/deliveryStatus';
import { countWaiting, useQueuedReports } from '@/features/queue/reportsStore';
import { requestSync } from '@/features/queue/syncEngine';
import type { QueuedReport } from '@/features/queue/types';
import { colors, radius } from '@/theme';

export default function MyReportsScreen() {
  const { loaded, reports, sendingIds } = useQueuedReports();
  const waiting = countWaiting(reports);

  if (!loaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={reports.length === 0 ? styles.emptyContent : styles.listContent}
      data={reports}
      keyExtractor={(item) => item.submission.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <OfflineBanner />
          {waiting > 0 && <WaitingSummary count={waiting} />}
        </View>
      }
      ListEmptyComponent={<EmptyState />}
      renderItem={({ item }) => (
        <ReportCard report={item} sending={sendingIds.has(item.submission.id)} />
      )}
    />
  );
}

function WaitingSummary({ count }: { count: number }) {
  return (
    <View style={styles.summary}>
      <Icon name={icons.queued} size={24} color={colors.warning} />
      <View style={styles.flex}>
        <Text style={styles.summaryTitle}>
          {count === 1 ? '1 report waiting for signal' : `${count} reports waiting for signal`}
        </Text>
        <Text style={styles.summaryText}>
          Saved on your phone. Sends automatically when you get signal.
        </Text>
      </View>
      <Pressable
        onPress={() => requestSync({ ignoreBackoff: true })}
        hitSlop={8}
        accessibilityRole="button"
      >
        <Text style={styles.link}>Try now</Text>
      </Pressable>
    </View>
  );
}

function ReportCard({ report, sending }: { report: QueuedReport; sending: boolean }) {
  const { submission, photo } = report;
  const look = CATEGORY_APPEARANCE[submission.category];
  const status = deliveryStatusOf(report, sending);
  const photoWaiting = isPhotoWaiting(report);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/reports/[id]', params: { id: submission.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${CATEGORY_LABELS[submission.category]} report, ${status.label}`}
      accessibilityHint="Opens the report details"
    >
      {photo ? (
        <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.iconThumbnail, { backgroundColor: colors.categoryTint }]}>
          <Icon name={look.icon} size={28} color={colors.categoryIcon} />
        </View>
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
          <View style={[styles.statusPill, { backgroundColor: status.background }]}>
            <Icon name={status.icon} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          {photoWaiting && <Text style={styles.photoNote}>Photo still uploading</Text>}
        </View>
      </View>
      <View style={styles.chevron}>
        <Icon name={icons.chevron} size={22} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icons.reports} size={44} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No reports yet</Text>
      <Text style={styles.emptyMessage}>
        Reports you send will appear here, even ones still waiting for signal.
      </Text>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  header: {
    gap: 12,
  },
  flex: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  photoNote: {
    fontSize: 12,
    color: colors.textMuted,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
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
