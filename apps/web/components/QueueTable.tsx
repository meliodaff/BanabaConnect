"use client";

import type { ReportStatus, VerificationStatus } from "@banabaconnect/shared";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import {
  GuestBadge,
  OutsideBanabaTag,
  PriorityBadge,
  StatusPill,
  VerificationBadge,
} from "@/components/Badges";
import { LiveIndicator, useLiveReports } from "@/components/LiveUpdates";
import { groupedReportsHint, otherReportsLabel, type StatusFilter } from "@/lib/labels";
import { QUEUE_COLUMNS, QUEUE_DETAILS } from "@/lib/queueLayout";
import {
  describeSort,
  isDefaultSort,
  nextSort,
  sortQuery,
  type ReportSort,
  type SortKey,
} from "@/lib/reportSort";

/** A queue row, with times already formatted on the server (in Philippine time). */
export interface QueueRow {
  id: string;
  categoryLabel: string;
  description: string;
  hasPhoto: boolean;
  priority: number | null;
  status: ReportStatus;
  reporterName: string | null;
  reporterIsGuest: boolean;
  reporterVerification: VerificationStatus | null;
  reporterArea: string | null;
  /** Reports about the same incident, including this one. */
  clusterCount: number;
  /** Different people who reported it, not counting Invalid reports. */
  clusterPeople: number;
  /** Meters outside Barangay Banaba, or null if inside. */
  outsideBanabaM: number | null;
  reportedAgo: string;
  reportedAt: string;
  waited: string | null;
}

const HIGHLIGHT_MS = 20_000;
const TOAST_MS = 6_000;
const COLUMNS = QUEUE_COLUMNS;

// "Nearby" is shown inside the report cell rather than as its own column (it squeezed the report
// text); priority already counts nearby reports. Old ?sort=nearby links still work.
const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "priority", label: "Priority" },
  { key: "report", label: "Report" },
  { key: "reporter", label: "Reporter" },
  { key: "reported", label: "Reported" },
  { key: "status", label: "Status" },
];

export function QueueTable({
  rows,
  total,
  emptyMessage,
  filter,
  sort,
}: {
  rows: QueueRow[];
  /** Set when the list was cut short: how many reports the filter has in all. */
  total?: number;
  emptyMessage: string;
  /** The status filter, kept when the sort changes. */
  filter: StatusFilter;
  /** How the rows are already sorted (the page sorts them; the headers change it). */
  sort: ReportSort;
}) {
  // "Back to reports" on a report returns to this filter and sort.
  const backTo = `${filter}${sortQuery(sort)}`;
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [heldNewReports, setHeldNewReports] = useState(0);
  // True while the pointer is on the list or keyboard focus is inside it.
  const inUse = useRef({ pointer: false, focus: false });
  const isInUse = useCallback(() => inUse.current.pointer || inUse.current.focus, []);

  const handleNewReport = useCallback(
    (id: string, label: string) => {
      setFresh((current) => new Set(current).add(id));
      if (isInUse()) {
        setHeldNewReports((count) => count + 1);
      }
      const message = `New report: ${label}`;
      setToast(message);
      setTimeout(() => setToast((current) => (current === message ? null : current)), TOAST_MS);
      setTimeout(() => {
        setFresh((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }, HIGHLIGHT_MS);
    },
    [isInUse],
  );

  const { connected, held, applyUpdates } = useLiveReports({
    onNewReport: handleNewReport,
    shouldHold: isInUse,
  });

  const showUpdates = useCallback(() => {
    setHeldNewReports(0);
    applyUpdates();
  }, [applyUpdates]);

  // Once the staff member stops using the list, show what changed.
  const release = useCallback(() => {
    if (!isInUse() && held) {
      showUpdates();
    }
  }, [held, isInUse, showUpdates]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[15px]">
            <span className="font-bold">
              {total !== undefined
                ? `${rows.length} of ${total.toLocaleString("en-PH")} reports`
                : rows.length === 1
                  ? "1 report"
                  : `${rows.length} reports`}
            </span>
            <span className="text-muted"> · {describeSort(sort)}</span>
            {!isDefaultSort(sort) && (
              <>
                {" · "}
                <Link
                  href={`/reports?status=${filter}`}
                  scroll={false}
                  className="font-bold text-brand hover:underline"
                >
                  Reset to highest priority first
                </Link>
              </>
            )}
          </p>
          <p className="text-sm text-muted">
            Priority = 50% seriousness + 30% nearby reports + 20% verified reporter.
            {total !== undefined && ` Only the ${rows.length} highest-priority reports are listed.`}
            {/* The column names only show on wide screens. */}
            <span className="hidden xl:inline"> Click a column name to sort.</span>
          </p>
        </div>
        <LiveIndicator connected={connected} />
      </div>

      <div aria-live="assertive" className="pointer-events-none fixed right-6 top-6 z-50">
        {toast && (
          <div role="status" className="rounded-lg bg-urgent px-5 py-3.5 text-base font-bold text-white shadow-md">
            {toast}
          </div>
        )}
      </div>

      {held && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sun bg-sun-soft px-4 py-3">
          <p className="text-[15px] font-semibold">
            {heldNewReports > 0
              ? `${heldNewReports === 1 ? "1 new report" : `${heldNewReports} new reports`} and other changes are waiting.`
              : "Reports changed while you were reading."}{" "}
            <span className="font-normal text-muted">The list updates when you move away from it.</span>
          </p>
          <button
            type="button"
            onClick={showUpdates}
            className="rounded-md bg-brand px-4 py-2.5 text-[15px] font-bold text-white hover:bg-brand-dark"
          >
            Update list now
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center">
          <p className="text-lg font-bold">{emptyMessage}</p>
          <p className="mt-1 text-[15px] text-muted">New reports appear here automatically.</p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-lg border border-line bg-surface"
          onPointerEnter={() => {
            inUse.current.pointer = true;
          }}
          onPointerLeave={() => {
            inUse.current.pointer = false;
            release();
          }}
          onFocus={() => {
            inUse.current.focus = true;
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              inUse.current.focus = false;
              release();
            }
          }}
        >
          <nav
            aria-label="Sort reports"
            className={`hidden border-b border-line bg-page px-5 py-2 text-xs font-bold uppercase tracking-wide text-muted xl:grid ${COLUMNS}`}
          >
            {SORT_COLUMNS.map((column) => (
              <SortHeader key={column.key} column={column} current={sort} filter={filter} />
            ))}
          </nav>
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/reports/${row.id}?from=${backTo}`}
                  className={`grid px-5 py-3.5 transition hover:bg-brand-soft/50 ${COLUMNS} ${
                    fresh.has(row.id) ? "bg-sun-soft" : ""
                  }`}
                >
                  <PriorityBadge score={row.priority} />

                  {/* What happened: the type and anything to note, then the resident's words on one
                      line (all of it on hover and on the report). */}
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-bold leading-6">
                      {row.categoryLabel}
                      {fresh.has(row.id) && (
                        <span className="rounded-full bg-urgent px-2 py-0.5 text-xs font-bold text-white">NEW</span>
                      )}
                      {row.outsideBanabaM !== null && <OutsideBanabaTag meters={row.outsideBanabaM} />}
                      {row.clusterCount > 1 && (
                        <Chip title={groupedReportsHint(row.clusterPeople)}>{otherReportsLabel(row.clusterCount)}</Chip>
                      )}
                      {row.hasPhoto && <Chip>Photo</Chip>}
                    </p>
                    <p
                      title={row.description || undefined}
                      className={`mt-0.5 truncate text-sm leading-5 ${
                        row.description ? "text-ink/85" : "text-muted italic"
                      }`}
                    >
                      {row.description || "No description"}
                    </p>
                  </div>

                  <div className={QUEUE_DETAILS}>
                    <div className="w-56 min-w-0">
                      <p className="truncate text-[15px] font-semibold leading-6">
                        {row.reporterIsGuest ? "Guest reporter" : (row.reporterName ?? "Resident")}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                        {row.reporterIsGuest ? (
                          <GuestBadge />
                        ) : (
                          <>
                            {row.reporterVerification && <VerificationBadge status={row.reporterVerification} />}
                            {row.reporterArea && <span>{row.reporterArea}</span>}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="w-36">
                      <p className="text-[15px] font-semibold leading-6">{row.reportedAgo}</p>
                      <p className="text-[13px] text-muted">{row.reportedAt}</p>
                      {row.waited && (
                        <p className="text-[13px] font-semibold text-warning">Waited {row.waited} for signal</p>
                      )}
                    </div>

                    <div>
                      <StatusPill status={row.status} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** A small neutral note beside a report's type, like "2 other reports" (same size as the pills). */
function Chip({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <span
      title={title}
      className="inline-flex items-center whitespace-nowrap rounded-full border border-line bg-page px-2.5 py-1 text-[13px] font-semibold text-ink"
    >
      {children}
    </span>
  );
}

/**
 * A column name that sorts by it: first click in the column's usual order, a second click
 * reverses it. The sorted column is blue with an arrow; the others show a faint two-way arrow.
 */
function SortHeader({
  column,
  current,
  filter,
}: {
  column: { key: SortKey; label: string };
  current: ReportSort;
  filter: StatusFilter;
}) {
  const active = current.key === column.key;
  const next = nextSort(current, column.key);
  return (
    <Link
      href={`/reports?status=${filter}${sortQuery(next)}`}
      scroll={false}
      aria-current={active ? "true" : undefined}
      title={`Sort: ${describeSort(next)}`}
      className={`-mx-1.5 inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-1 uppercase hover:bg-surface hover:text-brand ${
        active ? "text-brand" : ""
      }`}
    >
      {column.label}
      <SortArrow direction={active ? current.dir : null} />
      <span className="sr-only">
        {active ? `, sorted: ${describeSort(current)}. ` : ". "}
        Sort {describeSort(next).toLowerCase()}
      </span>
    </Link>
  );
}

function SortArrow({ direction }: { direction: "asc" | "desc" | null }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className={`h-3 w-3 ${direction ? "" : "opacity-40"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "asc" ? (
        <path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" />
      ) : direction === "desc" ? (
        <path d="M6 2v8M2.5 6.5 6 10l3.5-3.5" />
      ) : (
        <path d="M3.5 4.5 6 2l2.5 2.5M3.5 7.5 6 10l2.5-2.5" />
      )}
    </svg>
  );
}
