import { VERIFICATION_LABELS, type ReportStatus, type VerificationStatus } from "@banabaconnect/shared";
import { formatDistance, scoreOutOf100 } from "@/lib/format";
import { PRIORITY_BADGES, PRIORITY_BAND_LABELS, STAFF_STATUS_LABELS, priorityBand } from "@/lib/labels";

/*
 * State indicators follow .claude/skills/anti-slop-status-colors: color shows attention, not
 * identity. Pills are neutral; a small glyph carries the state's shape, and only states that
 * need attention or are in motion color it.
 */

type GlyphKind = "dot" | "half" | "check" | "slash" | "clock" | "ring" | "pin";

function Glyph({ kind, className }: { kind: GlyphKind; className: string }) {
  return (
    <svg viewBox="0 0 12 12" width={12} height={12} aria-hidden className={`shrink-0 ${className}`}>
      {kind === "dot" && <circle cx="6" cy="6" r="4" fill="currentColor" />}
      {kind === "ring" && <circle cx="6" cy="6" r="3.75" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {kind === "half" && (
        <>
          <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 1.75a4.25 4.25 0 0 1 0 8.5z" fill="currentColor" />
        </>
      )}
      {kind === "check" && (
        <path
          d="M2.25 6.25l2.5 2.5 5-5.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {kind === "slash" && (
        <>
          <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 9l6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {kind === "pin" && (
        <>
          <path
            d="M6 11s-3.5-3.1-3.5-5.75a3.5 3.5 0 0 1 7 0C9.5 7.9 6 11 6 11z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="6" cy="5.25" r="1.25" fill="currentColor" />
        </>
      )}
      {kind === "clock" && (
        <>
          <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 3.75V6l1.5 1" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function Pill({
  glyph,
  glyphClass = "text-muted",
  textClass = "text-ink",
  tinted = false,
  children,
}: {
  glyph: GlyphKind | null;
  glyphClass?: string;
  textClass?: string;
  tinted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[13px] font-bold ${
        tinted ? "border-brand/30 bg-brand-soft" : "border-line bg-surface"
      } ${textClass}`}
    >
      {glyph && <Glyph kind={glyph} className={glyphClass} />}
      {children}
    </span>
  );
}

/** Priority out of 100, filled with its level's color (as on the map), with the level name in ink. */
export function PriorityBadge({ score, size = "md" }: { score: number | null; size?: "md" | "lg" }) {
  const band = priorityBand(score);
  const badge = PRIORITY_BADGES[band];
  const urgent = band === "critical" || band === "high";
  return (
    <div className="flex items-center gap-2.5" title={`Priority ${scoreOutOf100(score)} of 100`}>
      <span
        className={`inline-flex items-center justify-center rounded-lg border-2 font-bold tabular-nums ${
          size === "lg" ? "h-14 w-14 text-2xl" : "h-10 w-10 text-base"
        }`}
        style={{ backgroundColor: badge.fill, borderColor: badge.border, color: badge.number }}
      >
        {scoreOutOf100(score)}
      </span>
      <span className={`text-sm ${urgent ? "font-bold text-ink" : "font-semibold text-muted"}`}>
        {PRIORITY_BAND_LABELS[band]}
      </span>
    </div>
  );
}

const STATUS_STYLE: Record<
  ReportStatus,
  { glyph: GlyphKind; glyphClass: string; textClass: string; tinted?: boolean }
> = {
  // New and untouched: a blue dot, so it reads as "waiting for someone".
  received: { glyph: "dot", glyphClass: "text-brand", textClass: "text-ink" },
  // Someone is on it: the only tinted status.
  in_progress: { glyph: "half", glyphClass: "text-brand", textClass: "text-brand", tinted: true },
  // Settled: calm. A small green check is the only confirmation.
  resolved: { glyph: "check", glyphClass: "text-success", textClass: "text-ink" },
  invalid: { glyph: "slash", glyphClass: "text-muted", textClass: "text-muted" },
};

export function StatusPill({ status }: { status: ReportStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <Pill glyph={style.glyph} glyphClass={style.glyphClass} textClass={style.textClass} tinted={style.tinted}>
      {STAFF_STATUS_LABELS[status]}
    </Pill>
  );
}

const VERIFICATION_STYLE: Record<
  VerificationStatus,
  { glyph: GlyphKind; glyphClass: string; textClass: string }
> = {
  verified: { glyph: "check", glyphClass: "text-success", textClass: "text-ink" },
  // Waiting on staff to review: the work item, so its glyph is brand blue.
  pending: { glyph: "clock", glyphClass: "text-brand", textClass: "text-ink" },
  unverified: { glyph: "ring", glyphClass: "text-muted", textClass: "text-muted" },
  rejected: { glyph: "slash", glyphClass: "text-muted", textClass: "text-muted" },
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const style = VERIFICATION_STYLE[status];
  return (
    <Pill glyph={style.glyph} glyphClass={style.glyphClass} textClass={style.textClass}>
      {VERIFICATION_LABELS[status]}
    </Pill>
  );
}

/**
 * A report sent from outside Barangay Banaba (beyond GPS error). Flagged, not rejected: it may
 * be for a neighboring barangay, so staff decide. Orange glyph: worth a look, not urgent.
 */
export function OutsideBanabaTag({ meters }: { meters: number }) {
  return (
    <span title={`Sent from ${formatDistance(meters)} outside Barangay Banaba`}>
      <Pill glyph="pin" glyphClass="text-warning">
        Outside Banaba
      </Pill>
    </span>
  );
}

export function GuestBadge() {
  return (
    <Pill glyph="ring" textClass="text-muted">
      Guest
    </Pill>
  );
}
