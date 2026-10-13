/**
 * Layout of the Reports list, shared by the list and its loading skeleton so they line up.
 * It lives here because values exported from a "use client" file can't be read by server
 * components.
 *
 * From 1280 px wide: one compact row per report in five columns (priority, report, reporter,
 * reported, status). Only the report column stretches; the others stay just wide enough for
 * their content, so a big monitor shows more of each description instead of spreading the row
 * out. Narrower: the priority badge on the left, the report beside it, and the reporter, time
 * and status on one line under the report (QUEUE_DETAILS).
 */
export const QUEUE_COLUMNS =
  "grid-cols-[108px_minmax(0,1fr)] items-start gap-x-4 gap-y-2 xl:grid-cols-[108px_minmax(0,1fr)_224px_144px_112px] xl:gap-x-5";

/**
 * Wraps the reporter, reported and status cells: one line under the report, own columns from xl.
 * The reporter and reported cells are w-56 and w-36 (the 224px and 144px columns above), so the
 * times and statuses line up from row to row on the narrow layout too.
 */
export const QUEUE_DETAILS = "col-start-2 flex flex-wrap items-start gap-x-6 gap-y-2 xl:contents";
