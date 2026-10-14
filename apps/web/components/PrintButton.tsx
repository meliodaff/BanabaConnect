"use client";

import { useDictionary } from "@/components/I18nProvider";

/**
 * Opens the browser's print window, where staff can also choose "Save as PDF" as the printer.
 * While it's open the page title is `documentTitle`, which browsers suggest as the PDF's name.
 * `primary` where printing is the page's main action (the monthly report).
 */
export function PrintButton({
  documentTitle,
  label,
  primary = false,
}: {
  documentTitle: string;
  /** Instead of "Print / Save as PDF", e.g. "Print this guide". */
  label?: string;
  primary?: boolean;
}) {
  const t = useDictionary();

  function print() {
    const previous = document.title;
    window.addEventListener("afterprint", () => (document.title = previous), { once: true });
    document.title = documentTitle;
    window.print();
  }

  return (
    <button
      type="button"
      onClick={print}
      className={`rounded-md border px-4 py-2 text-[15px] font-bold print:hidden ${
        primary
          ? "border-brand bg-brand text-white hover:bg-brand-dark"
          : "border-line bg-surface text-ink hover:border-brand hover:text-brand"
      }`}
    >
      {label ?? t.common.print}
    </button>
  );
}
