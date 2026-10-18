import type { ReportSubmission } from '@banabaconnect/shared';

/** Identical RPC arguments for ordinary requests and iOS file-backed uploads. */
export function reportPayload(submission: ReportSubmission) {
  return {
    p_id: submission.id,
    p_category: submission.category,
    p_latitude: submission.latitude,
    p_longitude: submission.longitude,
    p_location_accuracy: submission.locationAccuracy,
    p_description: submission.description,
    p_incident_at: submission.incidentAt,
    p_created_at: submission.createdAt,
    // Only for SOS, so other reports still work against a database without the SOS migration.
    ...(submission.phoneLockConfirmed == null ? {} : { p_phone_lock_confirmed: submission.phoneLockConfirmed }),
  };
}
