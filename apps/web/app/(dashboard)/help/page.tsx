import { REPORT_STATUSES } from "@banabaconnect/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusPill } from "@/components/Badges";
import { PageHeader } from "@/components/PageHeader";
import { PrintButton } from "@/components/PrintButton";
import { getDictionary } from "@/lib/i18n-server";
import type { PriorityBand } from "@/lib/labels";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).help.title };
}

const BANDS: PriorityBand[] = ["critical", "high", "medium", "low"];

/**
 * How to use the dashboard, in the staff member's language. It prints as a quick guide to keep
 * next to the barangay hall computer (the page header and buttons stay off the paper).
 */
export default async function HelpPage() {
  const t = await getDictionary();
  const help = t.help;

  return (
    <>
      <div className="print:hidden">
        <PageHeader title={help.title} description={help.description}>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/settings" className="rounded-md border border-line px-4 py-2 text-[15px] font-bold hover:border-brand hover:text-brand">
              {t.nav.settings}
            </Link>
            <PrintButton documentTitle={help.guideTitle} label={help.printGuide} primary />
          </div>
        </PageHeader>
      </div>

      <div className="px-8 py-6 print:p-0">
        {/* On paper the page header is left out, so the guide gets its own title. */}
        <h1 className="mb-3 hidden text-xl font-bold print:block">{help.guideTitle}</h1>

        <div className="grid items-start gap-6 xl:grid-cols-2 print:grid-cols-2 print:gap-2">
          <HelpCard title={help.newReport.title}>
            <Steps items={help.newReport.steps} />
          </HelpCard>

          <HelpCard title={help.statuses.title}>
            <dl className="space-y-2">
              {REPORT_STATUSES.map((status) => (
                <div key={status} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <dt>
                    <StatusPill status={status} />
                  </dt>
                  <dd className="text-muted">{t.statusHint[status]}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-muted">{help.statuses.invalidNote}</p>
          </HelpCard>

          <HelpCard title={help.priority.title}>
            <Paragraphs items={help.priority.body} />
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
              {BANDS.map((band) => (
                <div key={band} className="contents">
                  <dt className="font-bold">{t.priority[band]}</dt>
                  <dd className="text-muted">{help.priority.ranges[band]}</dd>
                </div>
              ))}
            </dl>
          </HelpCard>

          <HelpCard title={help.ids.title}>
            <Steps items={help.ids.steps} />
          </HelpCard>

          <HelpCard title={help.alerts.title}>
            <Paragraphs items={help.alerts.body} />
          </HelpCard>

          <HelpCard title={help.printing.title}>
            <Paragraphs items={help.printing.body} />
          </HelpCard>

          <HelpCard title={help.problems.title}>
            <dl className="space-y-2.5">
              {help.problems.items.map((item) => (
                <div key={item.problem}>
                  <dt className="font-bold">{item.problem}</dt>
                  <dd className="text-muted">{item.fix}</dd>
                </div>
              ))}
            </dl>
          </HelpCard>

          <HelpCard title={help.reading.title}>
            <Paragraphs items={help.reading.items} />
          </HelpCard>
        </div>
      </div>
    </>
  );
}

function HelpCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid rounded-lg border border-line bg-surface p-5 text-[15px] leading-relaxed print:rounded print:px-3 print:py-2.5 print:text-[11px] print:leading-snug">
      <h2 className="mb-3 text-base font-bold print:mb-1 print:text-[12.5px]">{title}</h2>
      {children}
    </section>
  );
}

/** Numbered steps, in order. */
function Steps({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 marker:font-bold marker:text-brand print:space-y-0.5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}

function Paragraphs({ items }: { items: string[] }) {
  return (
    <div className="space-y-2 print:space-y-1">
      {items.map((item) => (
        <p key={item}>{item}</p>
      ))}
    </div>
  );
}
