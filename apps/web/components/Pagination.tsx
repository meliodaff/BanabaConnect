import Link from "next/link";
import { PAGE_SIZE, pageCount } from "@/lib/pagination";

const BUTTON = "inline-flex h-9 items-center rounded-md border px-3 text-sm font-bold transition";
const IDLE = "border-line bg-surface text-ink hover:border-brand hover:text-brand";

/**
 * Page links under a long list: "Showing 16–30 of 47 reports", Previous, the page numbers and
 * Next. Hidden when everything fits on one page. Each link lands on the top of the list
 * (`anchor`): Next.js keeps the scroll position otherwise, which would leave the staff member
 * looking at the bottom of the new page.
 */
export function Pagination({
  page,
  total,
  noun,
  hrefFor,
  anchor,
  className = "",
}: {
  /** The current page, from 1. */
  page: number;
  /** How many rows the whole list has. */
  total: number;
  /** What the list shows, in the plural, e.g. "reports". */
  noun: string;
  /** The list's URL for a page (without the anchor). */
  hrefFor: (page: number) => string;
  /** The id at the top of the list. */
  anchor: string;
  className?: string;
}) {
  const pages = pageCount(total);
  if (pages <= 1) return null;
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const href = (target: number) => `${hrefFor(target)}#${anchor}`;

  return (
    <nav aria-label={`Pages of ${noun}`} className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <p className="text-sm text-muted">
        Showing{" "}
        <span className="font-bold text-ink">
          {first}–{last}
        </span>{" "}
        of {total.toLocaleString("en-PH")} {noun}
      </p>
      <ul className="flex flex-wrap items-center gap-1.5">
        <li>
          <StepLink href={page > 1 ? href(page - 1) : null}>← Previous</StepLink>
        </li>
        {pageList(page, pages).map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} aria-hidden className="px-1 text-sm text-muted">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={href(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                className={`${BUTTON} min-w-9 justify-center tabular-nums ${
                  item === page ? "border-brand bg-brand text-white" : IDLE
                }`}
              >
                {item}
              </Link>
            </li>
          ),
        )}
        <li>
          <StepLink href={page < pages ? href(page + 1) : null}>Next →</StepLink>
        </li>
      </ul>
    </nav>
  );
}

/** Previous or Next: a link, or muted text on the first or last page. */
function StepLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (href === null) {
    return (
      <span aria-disabled="true" className={`${BUTTON} border-line bg-page text-muted`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={`${BUTTON} ${IDLE}`}>
      {children}
    </Link>
  );
}

/**
 * The page numbers to show: the first and last pages and the ones next to the current page, with
 * "…" for the gaps, e.g. 1 … 4 5 6 … 20. A gap of one page shows that page instead.
 */
function pageList(page: number, pages: number): (number | "gap")[] {
  const shown = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((item) => item >= 1 && item <= pages)
    .sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  let previous = 0;
  for (const item of shown) {
    if (item - previous === 2) items.push(previous + 1);
    else if (item - previous > 2) items.push("gap");
    items.push(item);
    previous = item;
  }
  return items;
}
