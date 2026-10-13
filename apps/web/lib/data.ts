import {
  isReportCategory,
  isReportStatus,
  type ReportCategory,
  type ReportStatus,
  type VerificationStatus,
} from "@banabaconnect/shared";
import { HIGH_PRIORITY_MIN } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

// Every query runs as the signed-in staff member; row-level security lets admins read everything.

// Signed photo links only need to last while the page is open.
const PHOTO_LINK_SECONDS = 60 * 60;
/** The most reports one list shows (the highest priority ones). Counts aren't limited. */
export const QUEUE_LIMIT = 300;

export interface Reporter {
  id: string;
  name: string | null;
  isGuest: boolean;
  verification: VerificationStatus;
  phone: string | null;
  area: string | null;
  address: string | null;
}

export interface ReportSummary {
  id: string;
  category: ReportCategory;
  status: ReportStatus;
  priority: number | null;
  severity: number | null;
  volume: number | null;
  credibility: number | null;
  description: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  createdAt: string;
  receivedAt: string;
  incidentAt: string;
  statusUpdatedAt: string;
  clusterId: string | null;
  /** Reports about the same incident, including this one. */
  clusterCount: number;
  /** Different residents who reported it, not counting Invalid reports. Drives volume. */
  clusterPeople: number;
  /**
   * How far outside Barangay Banaba it was sent from, in meters, or null if inside (or close
   * enough that GPS error could explain it). Flagged, never rejected.
   */
  outsideBanabaM: number | null;
  hasPhoto: boolean;
  reporter: Reporter | null;
}

const SUMMARY_COLUMNS = `
  id, category, status, priority_score, severity_score, volume_score, credibility_score,
  description, latitude, longitude, location_accuracy_m, created_at, received_at, incident_at,
  status_updated_at, photo_path, cluster_id, outside_banaba_m,
  cluster:incident_clusters(report_count, reporter_count),
  reporter:profiles!reports_reporter_id_fkey(id, full_name, is_guest, verification_status, phone, area, address)
`;

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from an untyped Supabase client */
function toNumber(value: any): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function toReporter(row: any): Reporter | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.full_name?.trim() || null,
    isGuest: Boolean(row.is_guest),
    verification: row.verification_status,
    phone: row.phone,
    area: row.area,
    address: row.address,
  };
}

function toSummary(row: any): ReportSummary | null {
  if (!isReportCategory(row.category) || !isReportStatus(row.status)) return null;
  return {
    id: row.id,
    category: row.category,
    status: row.status,
    priority: toNumber(row.priority_score),
    severity: toNumber(row.severity_score),
    volume: toNumber(row.volume_score),
    credibility: toNumber(row.credibility_score),
    description: row.description ?? "",
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: toNumber(row.location_accuracy_m),
    createdAt: row.created_at,
    receivedAt: row.received_at,
    incidentAt: row.incident_at,
    statusUpdatedAt: row.status_updated_at,
    clusterId: row.cluster_id,
    clusterCount: row.cluster?.report_count ?? 1,
    clusterPeople: row.cluster?.reporter_count ?? 1,
    outsideBanabaM: toNumber(row.outside_banaba_m),
    hasPhoto: Boolean(row.photo_path),
    reporter: toReporter(row.reporter),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** The queue: highest priority first, then newest. */
export async function listReports(statuses: readonly ReportStatus[]): Promise<ReportSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select(SUMMARY_COLUMNS)
    .in("status", [...statuses])
    .order("priority_score", { ascending: false, nullsFirst: false })
    .order("received_at", { ascending: false })
    .limit(QUEUE_LIMIT);
  if (error) throw error;
  return (data ?? []).map(toSummary).filter((row): row is ReportSummary => row !== null);
}

export interface StatusChange {
  id: number;
  from: ReportStatus | null;
  to: ReportStatus;
  note: string | null;
  changedAt: string;
  changedBy: string | null;
}

export interface ReportDetail extends ReportSummary {
  photoUrl: string | null;
  photoWidth: number | null;
  photoHeight: number | null;
  history: StatusChange[];
  linked: ReportSummary[];
}

export async function getReport(id: string): Promise<ReportDetail | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("reports")
    .select(`${SUMMARY_COLUMNS}, photo_width, photo_height`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  const summary = row ? toSummary(row) : null;
  if (!row || !summary) return null;

  const [history, linked, photoUrl] = await Promise.all([
    supabase
      .from("report_status_history")
      .select("id, from_status, to_status, note, changed_at, changer:profiles!report_status_history_changed_by_fkey(full_name, role)")
      .eq("report_id", id)
      .order("changed_at", { ascending: true }),
    summary.clusterId
      ? supabase
          .from("reports")
          .select(SUMMARY_COLUMNS)
          .eq("cluster_id", summary.clusterId)
          .neq("id", id)
          .order("received_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    row.photo_path
      ? supabase.storage.from("report-photos").createSignedUrl(row.photo_path, PHOTO_LINK_SECONDS)
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (history.error) throw history.error;
  if (linked.error) throw linked.error;

  return {
    ...summary,
    photoUrl: photoUrl.data?.signedUrl ?? null,
    photoWidth: row.photo_width,
    photoHeight: row.photo_height,
    history: (history.data ?? [])
      .filter((h) => isReportStatus(h.to_status))
      .map((h) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- joined row
        const changer = h.changer as any;
        return {
          id: h.id,
          from: isReportStatus(h.from_status) ? h.from_status : null,
          to: h.to_status,
          note: h.note,
          changedAt: h.changed_at,
          changedBy:
            changer?.role === "admin" ? changer.full_name?.trim() || "Barangay staff" : "Reporter",
        };
      }),
    linked: (linked.data ?? []).map(toSummary).filter((r): r is ReportSummary => r !== null),
  };
}

export interface ResidentForReview {
  id: string;
  name: string | null;
  phone: string | null;
  area: string | null;
  address: string | null;
  verification: VerificationStatus;
  note: string | null;
  verifiedAt: string | null;
  updatedAt: string;
  idPhotoUrl: string | null;
}

export async function listResidents(
  statuses: readonly VerificationStatus[],
): Promise<ResidentForReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, phone, area, address, verification_status, verification_note, verified_at, updated_at, verification_document_path",
    )
    .eq("role", "resident")
    .eq("is_guest", false)
    .in("verification_status", [...statuses])
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  const rows = data ?? [];
  const paths = rows.map((r) => r.verification_document_path).filter(Boolean) as string[];
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const signed = await supabase.storage
      .from("verification-documents")
      .createSignedUrls(paths, PHOTO_LINK_SECONDS);
    for (const item of signed.data ?? []) {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.full_name?.trim() || null,
    phone: r.phone,
    area: r.area,
    address: r.address,
    verification: r.verification_status,
    note: r.verification_note,
    verifiedAt: r.verified_at,
    updatedAt: r.updated_at,
    idPhotoUrl: r.verification_document_path ? (urls.get(r.verification_document_path) ?? null) : null,
  }));
}

/** Reports that reached the barangay since `sinceIso`, and how many of those were resolved. */
export async function countReportsSince(sinceIso: string): Promise<{ received: number; resolved: number }> {
  const supabase = await createClient();
  const [received, resolved] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }).gte("received_at", sinceIso),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .gte("received_at", sinceIso)
      .eq("status", "resolved"),
  ]);
  if (received.error) throw received.error;
  if (resolved.error) throw resolved.error;
  return { received: received.count ?? 0, resolved: resolved.count ?? 0 };
}

export interface ReportCounts {
  byStatus: Record<ReportStatus, number>;
  /** Critical or High priority, still Received: nobody has started on them. */
  urgentWaiting: number;
  /** Marked Resolved since `sinceIso`. */
  resolvedSince: number;
}

/** For the status cards on the Reports page. Exact counts, unlike the list (QUEUE_LIMIT). */
export async function countReportsByStatus(sinceIso: string): Promise<ReportCounts> {
  const supabase = await createClient();
  const count = () => supabase.from("reports").select("id", { count: "exact", head: true });
  const results = await Promise.all([
    count().eq("status", "received"),
    count().eq("status", "in_progress"),
    count().eq("status", "resolved"),
    count().eq("status", "invalid"),
    count().eq("status", "received").gte("priority_score", HIGH_PRIORITY_MIN),
    count().eq("status", "resolved").gte("status_updated_at", sinceIso),
  ]);
  for (const result of results) {
    if (result.error) throw result.error;
  }
  const [received, inProgress, resolved, invalid, urgentWaiting, resolvedSince] = results.map(
    (result) => result.count ?? 0,
  );
  return {
    byStatus: { received, in_progress: inProgress, resolved, invalid },
    urgentWaiting,
    resolvedSince,
  };
}

/** How many reports have any of these statuses, e.g. a status filter's. */
export function countWithStatus(counts: ReportCounts, statuses: readonly ReportStatus[]): number {
  return statuses.reduce((sum, status) => sum + counts.byStatus[status], 0);
}

/** For the sidebar badge. */
export async function countPendingVerifications(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("verification_status", "pending");
  return count ?? 0;
}
