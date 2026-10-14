import type { Metadata } from "next";
import Link from "next/link";
import { MonthlyReportSheet } from "@/components/MonthlyReportSheet";
import { PageHeader } from "@/components/PageHeader";
import { PrintButton } from "@/components/PrintButton";
import { listReportsReceivedBetween } from "@/lib/data";
import { LANG_LOCALES } from "@/lib/i18n";
import { getDictionary, getLang } from "@/lib/i18n-server";
import { currentMonthInManila, formatMonth, monthRange, parseMonth, shiftMonth } from "@/lib/month";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).monthly.title };
}

const STEP = "inline-flex h-10 items-center rounded-md border px-3 text-sm font-bold";

/**
 * One month's reports as a document to print or save as a PDF (?month=2026-10, this month by
 * default). On screen it shows the sheet that will print; printing leaves out everything else.
 * The page around it follows the staff member's language; the sheet stays in English, as an
 * official record.
 */
export default async function MonthlyReportPage({ searchParams }: PageProps<"/reports/monthly">) {
  const params = await searchParams;
  const thisMonth = currentMonthInManila();
  const requested = parseMonth(params.month);
  // Nothing has happened in a future month yet, so a link to one shows this month.
  const month = requested && requested <= thisMonth ? requested : thisMonth;
  const { startIso, endIso } = monthRange(month);
  const [reports, t, lang] = await Promise.all([
    listReportsReceivedBetween(startIso, endIso),
    getDictionary(),
    getLang(),
  ]);
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const monthName = (value: string) => formatMonth(value, LANG_LOCALES[lang]);

  return (
    <>
      <div className="print:hidden">
        <PageHeader title={t.monthly.title} description={t.monthly.description}>
          <div className="flex flex-wrap items-center gap-3">
            <nav aria-label={t.monthly.monthNav} className="flex items-center gap-2">
              <Link
                href={`/reports/monthly?month=${previous}`}
                className={`${STEP} border-line bg-surface hover:border-brand hover:text-brand`}
              >
                ← {monthName(previous)}
              </Link>
              <span aria-current="page" className="px-2 text-[15px] font-bold">
                {monthName(month)}
              </span>
              {month < thisMonth ? (
                <Link
                  href={`/reports/monthly?month=${next}`}
                  className={`${STEP} border-line bg-surface hover:border-brand hover:text-brand`}
                >
                  {monthName(next)} →
                </Link>
              ) : (
                <span aria-disabled="true" title={t.monthly.notOver} className={`${STEP} border-line bg-page text-muted`}>
                  {monthName(next)} →
                </span>
              )}
            </nav>
            <PrintButton documentTitle={`Monthly report ${formatMonth(month)}`} primary />
          </div>
        </PageHeader>
      </div>

      <div className="px-8 py-6 print:p-0">
        <Link
          href="/reports"
          className="mb-4 inline-block py-2 text-[15px] font-bold text-brand hover:underline print:hidden"
        >
          {t.monthly.back}
        </Link>
        {/* The sheet as it will print: paper-sized on screen, the full page when printed. */}
        <div className="mx-auto max-w-[210mm] rounded-lg border border-line bg-surface px-[14mm] py-[12mm] shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <MonthlyReportSheet
            month={month}
            isCurrentMonth={month === thisMonth}
            reports={reports}
            asOf={new Date().toISOString()}
          />
        </div>
      </div>
    </>
  );
}
