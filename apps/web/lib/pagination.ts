/**
 * Paging for the dashboard's long lists (Reports, Residents). The page lives in the URL
 * (?page=2), like the filters and the sort, so refreshing, the back button and shared links keep it.
 */

/** Rows per page. */
export const PAGE_SIZE = 15;

/** ?page=3 → 3. Missing or invalid → 1. */
export function parsePage(value: unknown): number {
  const page = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** "&page=3" to add to a list URL, or "" for the first page (the default, so URLs stay clean). */
export function pageQuery(page: number): string {
  return page > 1 ? `&page=${page}` : "";
}

/** How many pages `total` rows fill: at least one, so an empty list still has page 1. */
export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}
