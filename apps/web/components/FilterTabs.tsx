import Link from "next/link";

/**
 * Filter links that set ?<param>=<key> on the current page, e.g. Active / Resolved / All.
 * They're links (the filter lives in the URL), so they're announced as navigation, not tabs.
 */
export function FilterTabs<Key extends string>({
  label,
  basePath,
  param,
  tabs,
  current,
  keepQuery = "",
}: {
  /** What the filter chooses, for screen readers, e.g. "Report status". */
  label: string;
  basePath: string;
  param: string;
  tabs: { key: Key; label: string }[];
  current: Key;
  /** Other settings to keep when switching, e.g. "&sort=reported&dir=asc". */
  keepQuery?: string;
}) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const selected = tab.key === current;
          return (
            <li key={tab.key}>
              <Link
                href={`${basePath}?${param}=${tab.key}${keepQuery}`}
                aria-current={selected ? "page" : undefined}
                className={`inline-block rounded-full border px-4 py-2.5 text-sm font-bold transition ${
                  selected
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-surface text-ink hover:border-brand hover:text-brand"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
