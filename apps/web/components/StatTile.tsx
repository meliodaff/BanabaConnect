import Link from "next/link";
import { getDictionary } from "@/lib/i18n-server";

/**
 * A small dot before the label marks a tile that needs attention (no colored edge: a left-border
 * accent is a generated-UI tell). Red = urgent, blue = work waiting that isn't urgent.
 */
const ATTENTION_DOT = { urgent: "bg-urgent", waiting: "bg-brand" } as const;

/**
 * One number staff act on, linking to where they act on it. No trends or sparklines: the
 * dashboard only shows numbers that come straight from the database.
 */
export async function StatTile({
  label,
  value,
  detail,
  href,
  action,
  accent = "none",
}: {
  label: string;
  value: number;
  detail: string;
  href: string;
  /** Where the tile goes, e.g. "Open the queue". */
  action: string;
  accent?: keyof typeof ATTENTION_DOT | "none";
}) {
  const t = await getDictionary();
  const attention = accent === "none" ? null : { dot: ATTENTION_DOT[accent], text: t.stat[accent] };
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-line bg-surface px-5 py-4 transition hover:border-brand"
    >
      <p className="flex items-center gap-2 text-[15px] font-semibold text-muted">
        {attention && (
          <>
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${attention.dot}`} aria-hidden />
            <span className="sr-only">{attention.text}:</span>
          </>
        )}
        {label}
      </p>
      <p className="mt-1 text-4xl font-bold text-ink">{value.toLocaleString("en-PH")}</p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
      <p className="mt-3 text-sm font-bold text-brand group-hover:underline">{action} →</p>
    </Link>
  );
}
