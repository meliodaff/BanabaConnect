/**
 * Calendar months in Philippine time, written as "2026-10" (the ?month= of the monthly report).
 * A month runs from midnight on the 1st to midnight on the 1st of the next month, Manila time.
 */

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** "2026-10" → "2026-10". Anything else → null. */
export function parseMonth(value: unknown): string | null {
  return typeof value === "string" && MONTH.test(value) ? value : null;
}

/** This month in the Philippines, e.g. "2026-10". */
export function currentMonthInManila(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" })
    .format(now)
    .slice(0, 7);
}

/** The month `delta` months away: ("2026-01", -1) → "2025-12". */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = year * 12 + (monthNumber - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Where the month starts and the next one starts, as ISO timestamps (for queries). */
export function monthRange(month: string): { startIso: string; endIso: string } {
  const start = (value: string) => new Date(`${value}-01T00:00:00+08:00`).toISOString();
  return { startIso: start(month), endIso: start(shiftMonth(month, 1)) };
}

/** "2026-10" → "October 2026" (with locale "fil-PH": "Oktubre 2026"). */
export function formatMonth(month: string, locale = "en-PH"): string {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}
