"use client";

import Link from "next/link";
import { useDictionary } from "@/components/I18nProvider";

/** The Reports page's way to the monthly report (also shown while that page loads). */
export function MonthlyReportLink() {
  const t = useDictionary();
  return (
    <Link
      href="/reports/monthly"
      className="rounded-md border border-line bg-surface px-4 py-2 text-[15px] font-bold text-ink hover:border-brand hover:text-brand"
    >
      {t.monthly.link}
    </Link>
  );
}
