/**
 * Layout of the Reports list, shared by the list and its loading skeleton so they line up.
 * It lives here because values exported from a "use client" file can't be read by server
 * components.
 *
 * Wide screens: priority, report, reporter, reported, status. The report gets the most room
 * (about 400 px on a 1366 px laptop beside the sidebar). Narrow screens: the priority badge on
 * the left, everything else stacked beside it (cells after the report use QUEUE_STACKED).
 */
export const QUEUE_COLUMNS =
  "grid-cols-[120px_minmax(0,1fr)] items-start gap-x-4 gap-y-3 lg:grid-cols-[120px_minmax(0,2.4fr)_minmax(0,1.2fr)_150px_130px] lg:gap-x-6";

/** For cells after the report: stacked under it on narrow screens, own column on wide ones. */
export const QUEUE_STACKED = "col-start-2 lg:col-start-auto";
