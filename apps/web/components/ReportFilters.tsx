"use client";

import { REPORT_CATEGORIES } from "@banabaconnect/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useDictionary } from "@/components/I18nProvider";
import {
  DATE_FILTERS,
  PRIORITY_BAND_RANGES,
  filtersQuery,
  hasDropdownFilter,
  parseDateFilter,
  parseLevelFilter,
  parseTypeFilter,
  type ListFilters,
  type PriorityBand,
  type StatusFilter,
} from "@/lib/labels";
import { sortQuery, type ReportSort } from "@/lib/reportSort";

const SELECT =
  "w-full rounded-md border bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:cursor-wait";

/**
 * Dropdowns above the Reports list that narrow it by type of incident, priority level and when
 * reports reached the barangay. Like the status cards, they set the URL (?type=, ?level=, ?date=),
 * keeping the status, sort and the other filters, and go back to the first page.
 */
export function ReportFilters({
  filter,
  filters,
  sort,
}: {
  filter: StatusFilter;
  filters: ListFilters;
  sort: ReportSort;
}) {
  const t = useDictionary();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const hrefWith = (changed: Partial<ListFilters>) =>
    `/reports?status=${filter}${sortQuery(sort)}${filtersQuery({ ...filters, ...changed })}`;
  const go = (changed: Partial<ListFilters>) =>
    startTransition(() => router.push(hrefWith(changed), { scroll: false }));

  return (
    <fieldset data-tour="report-filters" aria-busy={pending || undefined} className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-3">
      <legend className="sr-only">{t.listFilters.label}</legend>

      <FilterSelect
        id="filter-type"
        label={t.listFilters.type}
        value={filters.type ?? ""}
        disabled={pending}
        onChange={(value) => go({ type: parseTypeFilter(value) })}
      >
        <option value="">{t.listFilters.anyType}</option>
        {REPORT_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {t.category[category]}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        id="filter-level"
        label={t.listFilters.level}
        value={filters.level ?? ""}
        disabled={pending}
        onChange={(value) => go({ level: parseLevelFilter(value) })}
      >
        <option value="">{t.listFilters.anyLevel}</option>
        {(Object.keys(PRIORITY_BAND_RANGES) as PriorityBand[]).map((level) => (
          <option key={level} value={level}>
            {t.priority[level]}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        id="filter-date"
        label={t.listFilters.date}
        value={filters.date ?? ""}
        disabled={pending}
        onChange={(value) => go({ date: parseDateFilter(value) })}
      >
        <option value="">{t.listFilters.anyDate}</option>
        {DATE_FILTERS.map((date) => (
          <option key={date} value={date}>
            {t.listFilters.dates[date]}
          </option>
        ))}
      </FilterSelect>

      {hasDropdownFilter(filters) && (
        <Link
          href={hrefWith({ type: null, level: null, date: null })}
          scroll={false}
          className="rounded-md px-2 py-2.5 text-[15px] font-bold text-brand hover:underline"
        >
          {t.listFilters.clear}
        </Link>
      )}
    </fieldset>
  );
}

/** A labeled dropdown; outlined in blue while it narrows the list, so applied filters stand out. */
function FilterSelect({
  id,
  label,
  value,
  disabled,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="w-48">
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${SELECT} ${value ? "border-brand font-semibold text-brand" : "border-line"}`}
      >
        {children}
      </select>
    </div>
  );
}
