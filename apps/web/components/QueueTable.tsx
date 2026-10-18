"use client";

import type { ReportCategory, ReportStatus, VerificationStatus } from "@banabaconnect/shared";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import {
  GuestBadge,
  OutsideBanabaTag,
  PriorityBadge,
  StatusPill,
  VerificationBadge,
} from "@/components/Badges";
import { useDictionary } from "@/components/I18nProvider";
import { LiveIndicator, useLiveReports } from "@/components/LiveUpdates";
import { Pagination } from "@/components/Pagination";
import { filtersQuery, type ListFilters, type StatusFilter } from "@/lib/labels";
import { pageQuery } from "@/lib/pagination";
import { QUEUE_COLUMNS, QUEUE_DETAILS } from "@/lib/queueLayout";
import { isDefaultSort, nextSort, sortQuery, type ReportSort, type SortKey } from "@/lib/reportSort";

/** A queue row, with its words and times already in the staff member's language (from the server). */
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
  /** SOS only: false when the phone had no screen lock to confirm its owner. */
  phoneLockConfirmed: boolean | null;
  reportedAgo: string;
  reportedAt: string;
  waited: string | null;
}

const HIGHLIGHT_MS = 20_000;
const TOAST_MS = 6_000;
const COLUMNS = QUEUE_COLUMNS;

// "Nearby" is shown inside the report cell rather than as its own column (it squeezed the report
// text); priority already counts nearby reports. Old ?sort=nearby links still work.
const SORT_COLUMNS: SortKey[] = ["priority", "report", "reporter", "reported", "status"];

export function QueueTable({
  rows,
  count,
  page,
  total,
  emptyMessage,
  filter,
  filters,
  sort,
}: {
  /** This page's rows. */
  rows: QueueRow[];
  /** How many reports the list has, on all its pages. */
  count: number;
  /** The page shown, from 1. */
  page: number;
  /** Set when the list was cut short: how many reports the filter has in all. */
  total?: number;
  emptyMessage: string;
  /** The status filter, kept when the sort changes. */
  filter: StatusFilter;
  /** The date filter and Overview views (e.g. urgent only), kept when the sort or page changes. */
  filters: ListFilters;
  /** How the rows are already sorted (the page sorts them; the headers change it). */
  sort: ReportSort;
}) {
  const t = useDictionary();
  // "Back to reports" on a report returns to this filter, sort and page.
  const keep = filtersQuery(filters);
  const backTo = `${filter}${sortQuery(sort)}${pageQuery(page)}${keep}`;
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [heldNewReports, setHeldNewReports] = useState(0);
  // True while the pointer is on the list or keyboard focus is inside it.
  const inUse = useRef({ pointer: false, focus: false });
  const isInUse = useCallback(() => inUse.current.pointer || inUse.current.focus, []);

  const handleNewReport = useCallback(
    (id: string, category: ReportCategory | null) => {
      setFresh((current) => new Set(current).add(id));
      if (isInUse()) {
        setHeldNewReports((count) => count + 1);
      }
      const message = t.queue.newReport(category ? t.category[category] : t.report.title);
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
    [isInUse, t],
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
    // The page links land here, at the top of the list.
    <div id="reports-list" className="scroll-mt-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[15px]">
            <span className="font-bold">
              {total !== undefined ? t.queue.countOf(count, total.toLocaleString("en-PH")) : t.queue.count(count)}
            </span>
            <span className="text-muted"> · {t.sort.describe[sort.key][sort.dir]}</span>
            {!isDefaultSort(sort) && (
              <>
                {" · "}
                <Link
                  href={`/reports?status=${filter}${keep}`}
                  scroll={false}
                  className="font-bold text-brand hover:underline"
                >
                  {t.queue.resetSort}
                </Link>
              </>
            )}
          </p>
          {/* Each narrowing filter says what it keeps and how to undo it, keeping the others. */}
          {filters.only && (
            <FilterNote
              text={t.queue.only[filters.only]}
              clear={t.queue.showAllActive}
              href={`/reports?status=active${sortQuery(sort)}${filtersQuery({ ...filters, only: null })}`}
            />
          )}
          {filters.date === "today" && (
            <FilterNote
              text={t.queue.todayOnly}
              clear={t.queue.showAllDates}
              href={`/reports?status=${filter}${sortQuery(sort)}${filtersQuery({ ...filters, date: null })}`}
            />
          )}
          <p className="text-sm text-muted">
            {/* What priority means, in words; each report's page shows its own breakdown. */}
            {t.queue.priorityExplained}
            {total !== undefined && ` ${t.queue.cutShort(count)}`}
            {/* The column names only show on wide screens. */}
            <span className="hidden xl:inline"> {t.queue.clickToSort}</span>
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
            {heldNewReports > 0 ? t.queue.heldNew(heldNewReports) : t.queue.heldChanged}{" "}
            <span className="font-normal text-muted">{t.queue.heldHint}</span>
          </p>
          <button
            type="button"
            onClick={showUpdates}
            className="rounded-md bg-brand px-4 py-2.5 text-[15px] font-bold text-white hover:bg-brand-dark"
          >
            {t.queue.updateNow}
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center">
          <p className="text-lg font-bold">{emptyMessage}</p>
          <p className="mt-1 text-[15px] text-muted">{t.reports.emptyHint}</p>
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
            aria-label={t.sort.nav}
            className={`hidden border-b border-line bg-page px-5 py-2 text-xs font-bold uppercase tracking-wide text-muted xl:grid ${COLUMNS}`}
          >
            {SORT_COLUMNS.map((column) => (
              <SortHeader key={column} column={column} current={sort} filter={filter} keep={keep} />
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
                        <span className="rounded-full bg-urgent px-2 py-0.5 text-xs font-bold text-white">
                          {t.queue.newTag}
                        </span>
                      )}
                      {row.phoneLockConfirmed === false && (
                        <Chip title={t.badges.ownerNotConfirmedTitle}>{t.badges.ownerNotConfirmed}</Chip>
                      )}
                      {row.outsideBanabaM !== null && <OutsideBanabaTag meters={row.outsideBanabaM} />}
                      {row.clusterCount > 1 && (
                        <Chip title={t.nearby.hint(row.clusterPeople)}>{t.nearby.others(row.clusterCount)}</Chip>
                      )}
                      {row.hasPhoto && <Chip>{t.queue.photo}</Chip>}
                    </p>
                    <p
                      title={row.description || undefined}
                      className={`mt-0.5 truncate text-sm leading-5 ${
                        row.description ? "text-ink/85" : "text-muted italic"
                      }`}
                    >
                      {row.description || t.common.noDescription}
                    </p>
                  </div>

                  <div className={QUEUE_DETAILS}>
                    <div className="w-56 min-w-0">
                      <p className="truncate text-[15px] font-semibold leading-6">
                        {row.reporterIsGuest ? t.common.guestReporter : (row.reporterName ?? t.common.resident)}
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
                        <p className="text-[13px] font-semibold text-warning">{t.time.waitedForSignal(row.waited)}</p>
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
          <Pagination
            page={page}
            total={count}
            list="reports"
            baseHref={`/reports?status=${filter}${sortQuery(sort)}${keep}`}
            anchor="reports-list"
            className="border-t border-line bg-page px-5 py-3"
          />
        </div>
      )}
    </div>
  );
}

/** A filter that narrows the list, in words, with a link that removes just that filter. */
function FilterNote({ text, clear, href }: { text: string; clear: string; href: string }) {
  return (
    <p className="text-[15px]">
      <span className="font-semibold">{text}</span>
      {" · "}
      <Link href={href} scroll={false} className="font-bold text-brand hover:underline">
        {clear}
      </Link>
    </p>
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
  keep,
}: {
  column: SortKey;
  current: ReportSort;
  filter: StatusFilter;
  /** The other filters to keep, from filtersQuery. */
  keep: string;
}) {
  const t = useDictionary();
  const active = current.key === column;
  const next = nextSort(current, column);
  const nextOrder = t.sort.describe[next.key][next.dir];
  return (
    <Link
      href={`/reports?status=${filter}${sortQuery(next)}${keep}`}
      scroll={false}
      aria-current={active ? "true" : undefined}
      title={t.sort.title(nextOrder)}
      className={`-mx-1.5 inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-1 uppercase hover:bg-surface hover:text-brand ${
        active ? "text-brand" : ""
      }`}
    >
      {t.sort.columns[column]}
      <SortArrow direction={active ? current.dir : null} />
      <span className="sr-only">
        {active ? t.sort.current(t.sort.describe[current.key][current.dir]) : ". "}
        {t.sort.action(nextOrder)}
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
