import {
  isReportCategory,
  isReportStatus,
  type ReportCategory,
  type ReportStatus,
  type VerificationStatus,
} from "@banabaconnect/shared";
import { HIGH_PRIORITY_MIN, PRIORITY_BAND_RANGES, type PriorityBand } from "@/lib/labels";
import { PAGE_SIZE, pageCount } from "@/lib/pagination";
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
  /**
   * SOS only: true when the phone's own lock (fingerprint, face, PIN) confirmed it, false when the
   * phone has no screen lock. Null for other reports and for SOS from before the column existed.
   */
  phoneLockConfirmed: boolean | null;
  hasPhoto: boolean;
  reporter: Reporter | null;
}

const SUMMARY_COLUMNS = `
  id, category, status, priority_score, severity_score, volume_score, credibility_score,
  description, latitude, longitude, location_accuracy_m, created_at, received_at, incident_at,
  status_updated_at, photo_path, cluster_id, outside_banaba_m, phone_lock_confirmed,
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
    phoneLockConfirmed: typeof row.phone_lock_confirmed === "boolean" ? row.phone_lock_confirmed : null,
    hasPhoto: Boolean(row.photo_path),
    reporter: toReporter(row.reporter),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * The queue: highest priority first, then newest. With `receivedSince`, only reports that arrived
 * since then; with `minPriority`, only reports at least that urgent (0 to 1).
 */
/** What the Reports page's dropdowns narrow a list or count to. */
export interface ReportFilters {
  /** Reached the barangay at or after this time. */
  receivedSince?: string;
  category?: ReportCategory | null;
  level?: PriorityBand | null;
}

interface FilterableQuery {
  gte(column: string, value: unknown): FilterableQuery;
  lt(column: string, value: unknown): FilterableQuery;
  eq(column: string, value: unknown): FilterableQuery;
  or(filters: string): FilterableQuery;
}

/**
 * Narrows a reports query (a list or a count) by the dropdown filters. Each filter returns the
 * same query, so it's handed back with its own type; checking that against Supabase's generated
 * types made TypeScript give up ("excessively deep"), hence the casts.
 */
function applyReportFilters<Query>(query: Query, { receivedSince, category, level }: ReportFilters): Query {
  let narrowed = query as unknown as FilterableQuery;
  if (receivedSince) narrowed = narrowed.gte("received_at", receivedSince);
  if (category) narrowed = narrowed.eq("category", category);
  if (level) {
    const { min, below } = PRIORITY_BAND_RANGES[level];
    if (min !== undefined) narrowed = narrowed.gte("priority_score", min);
    // Low also takes reports with no score yet, as priorityBand does.
    if (below !== undefined) {
      narrowed =
        min === undefined
          ? narrowed.or(`priority_score.lt.${below},priority_score.is.null`)
          : narrowed.lt("priority_score", below);
    }
  }
  return narrowed as unknown as Query;
}

export async function listReports(
  statuses: readonly ReportStatus[],
  { minPriority, ...filters }: ReportFilters & { minPriority?: number } = {},
): Promise<ReportSummary[]> {
  const supabase = await createClient();
  let query = applyReportFilters(supabase.from("reports").select(SUMMARY_COLUMNS).in("status", [...statuses]), filters);
  if (minPriority !== undefined) query = query.gte("priority_score", minPriority);
  const { data, error } = await query
    .order("priority_score", { ascending: false, nullsFirst: false })
    .order("received_at", { ascending: false })
    .limit(QUEUE_LIMIT);
  if (error) throw error;
  return (data ?? []).map(toSummary).filter((row): row is ReportSummary => row !== null);
}

/** The most rows the database returns per request; longer lists are read in batches. */
const BATCH = 1000;

export interface ReportWithResponse extends ReportSummary {
  /** When staff first dispatched responders, started handling, or resolved it. */
  firstActionAt: string | null;
}

/**
 * Every report that reached the barangay in [startIso, endIso), oldest first, for the monthly
 * report. All of them (in batches), not just the first QUEUE_LIMIT.
 */
export async function listReportsReceivedBetween(
  startIso: string,
  endIso: string,
): Promise<ReportWithResponse[]> {
  const supabase = await createClient();
  const rows = [];
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await supabase
      .from("reports")
      .select(`${SUMMARY_COLUMNS}, history:report_status_history(to_status, changed_at)`)
      .gte("received_at", startIso)
      .lt("received_at", endIso)
      .order("received_at", { ascending: true })
      .order("id")
      .range(from, from + BATCH - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < BATCH) break;
  }

  return rows.flatMap((row) => {
    const summary = toSummary(row);
    if (!summary) return [];
    const actions = (row.history ?? [])
      .filter((change) => ["dispatched", "in_progress", "resolved"].includes(change.to_status))
      .map((change) => change.changed_at)
      .sort();
    return [{ ...summary, firstActionAt: actions[0] ?? null }];
  });
}

export interface StatusChange {
  id: number;
  from: ReportStatus | null;
  to: ReportStatus;
  note: string | null;
  changedAt: string;
  /** The staff member's name, if they have one; null when the resident made the change. */
  changedBy: string | null;
  /** Barangay staff made the change (the first entry is the resident sending the report). */
  byStaff: boolean;
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
          changedBy: changer?.role === "admin" ? changer.full_name?.trim() || null : null,
          byStaff: changer?.role === "admin",
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

/** One page of residents (PAGE_SIZE), most recently changed first, and how many there are in all. */
export async function listResidents(
  statuses: readonly VerificationStatus[],
  requestedPage: number,
): Promise<{ residents: ResidentForReview[]; total: number; page: number }> {
  const supabase = await createClient();
  const fetchPage = (page: number) =>
    supabase
      .from("profiles")
      .select(
        "id, full_name, phone, area, address, verification_status, verification_note, verified_at, updated_at, verification_document_path",
      )
      .eq("role", "resident")
      .eq("is_guest", false)
      .in("verification_status", [...statuses])
      .order("updated_at", { ascending: false })
      // Ties broken the same way every time, so nobody shows on two pages or on none.
      .order("id")
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  // The count and the page together. A page past the end (the list got shorter, or an old link)
  // is fetched again as the last page.
  const [counted, requested] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "resident")
      .eq("is_guest", false)
      .in("verification_status", [...statuses]),
    fetchPage(requestedPage),
  ]);
  if (counted.error) throw counted.error;
  const total = counted.count ?? 0;
  const page = Math.min(requestedPage, pageCount(total));
  const { data, error } = page === requestedPage ? requested : await fetchPage(page);
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

  const residents = rows.map((r) => ({
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
  return { residents, total, page };
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

/**
 * For the status cards on the Reports page. Exact counts, unlike the list (QUEUE_LIMIT). With
 * `filters`, only the reports the dropdowns keep, so the cards match the filtered list.
 */
export async function countReportsByStatus(sinceIso: string, filters: ReportFilters = {}): Promise<ReportCounts> {
  const supabase = await createClient();
  const count = () => applyReportFilters(supabase.from("reports").select("id", { count: "exact", head: true }), filters);
  const results = await Promise.all([
    count().eq("status", "received"),
    count().eq("status", "dispatched"),
    count().eq("status", "in_progress"),
    count().eq("status", "resolved"),
    count().eq("status", "invalid"),
    count().eq("status", "received").gte("priority_score", HIGH_PRIORITY_MIN),
    count().eq("status", "resolved").gte("status_updated_at", sinceIso),
  ]);
  for (const result of results) {
    if (result.error) throw result.error;
  }
  const [received, dispatched, inProgress, resolved, invalid, urgentWaiting, resolvedSince] = results.map(
    (result) => result.count ?? 0,
  );
  return {
    byStatus: { received, dispatched, in_progress: inProgress, resolved, invalid },
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
