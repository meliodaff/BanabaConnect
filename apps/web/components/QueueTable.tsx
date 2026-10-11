"use client";

import type { ReportStatus, VerificationStatus } from "@banabaconnect/shared";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { PriorityBadge, StatusPill, VerificationBadge } from "@/components/Badges";
import { LiveIndicator, useLiveReports } from "@/components/LiveUpdates";

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
  clusterCount: number;
  reportedAgo: string;
  reportedAt: string;
  waited: string | null;
}

const HIGHLIGHT_MS = 20_000;
const TOAST_MS = 6_000;
const COLUMNS =
  "lg:grid-cols-[150px_minmax(0,2fr)_minmax(0,1.3fr)_110px_150px_120px] lg:items-center lg:gap-4";

export function QueueTable({
  rows,
  emptyMessage,
  backTo,
}: {
  rows: QueueRow[];
  emptyMessage: string;
  /** The current filter, so "Back to reports" on a report returns to it. */
  backTo: string;
}) {
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Highest priority first. Priority = 50% seriousness + 30% nearby reports + 20% verified reporter.
        </p>
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
          <div
            className={`hidden gap-4 border-b border-line bg-page px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted lg:grid ${COLUMNS}`}
            aria-hidden
          >
            <span>Priority</span>
            <span>Report</span>
            <span>Reporter</span>
            <span>Nearby</span>
            <span>Reported</span>
            <span>Status</span>
          </div>
          <ul>
            {rows.map((row) => (
              <li key={row.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/reports/${row.id}?from=${backTo}`}
                  className={`grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-brand-soft/60 ${COLUMNS} ${
                    fresh.has(row.id) ? "bg-sun-soft" : ""
                  }`}
                >
                  <PriorityBadge score={row.priority} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-base font-bold">
                      {row.categoryLabel}
                      {fresh.has(row.id) && (
                        <span className="rounded-full bg-urgent px-2 py-0.5 text-xs font-bold text-white">NEW</span>
                      )}
                      {row.hasPhoto && <span className="text-sm font-semibold text-muted">· Photo</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{row.description || "No description"}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">
                      {row.reporterIsGuest ? "Guest reporter" : (row.reporterName ?? "Resident")}
                    </p>
                    {!row.reporterIsGuest && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
                        {row.reporterVerification && <VerificationBadge status={row.reporterVerification} />}
                        {row.reporterArea}
                      </p>
                    )}
                  </div>
                  <p className={`text-[15px] ${row.clusterCount > 1 ? "font-bold" : "text-muted"}`}>
                    {row.clusterCount > 1 ? `${row.clusterCount} reports` : "No others"}
                  </p>
                  <div>
                    <p className="text-[15px] font-semibold" title={row.reportedAt}>
                      {row.reportedAgo}
                    </p>
                    {row.waited && (
                      <p className="text-sm font-semibold text-warning">Waited {row.waited} for signal</p>
                    )}
                  </div>
                  <div>
                    <StatusPill status={row.status} />
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
