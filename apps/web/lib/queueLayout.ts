/**
 * Column widths of the Reports list (priority, report, reporter, nearby, reported, status).
 * Shared by the list and its loading skeleton so the skeleton lines up exactly; it lives here
 * because values exported from a "use client" file can't be read by server components.
 */
export const QUEUE_COLUMNS =
  "lg:grid-cols-[150px_minmax(0,2fr)_minmax(0,1.3fr)_110px_150px_120px] lg:items-center lg:gap-4";
