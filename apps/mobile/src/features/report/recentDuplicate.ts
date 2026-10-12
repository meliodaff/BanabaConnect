import type { ReportSubmission } from '@banabaconnect/shared';
import type { QueuedReport } from '@/features/queue/types';

/** Same distance the server uses to group reports of one incident (submit_report). */
const SAME_PLACE_METERS = 150;
/** A repeat within this time is most likely an accidental double send. */
const RECENT_MINUTES = 15;
const METERS_PER_DEGREE = 111_320;

function metersApart(a: { latitude: number; longitude: number }, b: typeof a) {
  const dLat = (a.latitude - b.latitude) * METERS_PER_DEGREE;
  const dLng =
    (a.longitude - b.longitude) * METERS_PER_DEGREE * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

/**
 * This person's own report of the same kind, near here, from the last few minutes, if any.
 * The app asks before sending another one: an accidental repeat clutters the barangay's queue,
 * but a second report can carry news ("it's spreading"), so it's never blocked.
 */
export function findRecentDuplicate(
  submission: ReportSubmission,
  ownReports: QueuedReport[],
): { report: QueuedReport; minutesAgo: number } | null {
  const now = Date.parse(submission.createdAt);
  let best: { report: QueuedReport; minutesAgo: number } | null = null;
  for (const report of ownReports) {
    const earlier = report.submission;
    if (earlier.category !== submission.category) continue;
    const minutesAgo = (now - Date.parse(earlier.createdAt)) / 60_000;
    if (minutesAgo < 0 || minutesAgo > RECENT_MINUTES) continue;
    if (metersApart(earlier, submission) > SAME_PLACE_METERS) continue;
    if (!best || minutesAgo < best.minutesAgo) {
      best = { report, minutesAgo };
    }
  }
  return best;
}
