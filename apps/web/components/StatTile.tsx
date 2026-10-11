import Link from "next/link";

const ACCENTS = {
  /** Something urgent needs action (red edge). */
  urgent: "border-l-urgent",
  /** Work waiting that isn't urgent, e.g. IDs to review (yellow edge). */
  waiting: "border-l-sun",
  none: "border-l-line",
} as const;

/**
 * One number staff act on, linking to where they act on it. No trends or sparklines: the
 * dashboard only shows numbers that come straight from the database.
 */
export function StatTile({
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
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-2xl border border-line border-l-4 bg-surface px-5 py-4 transition hover:border-brand ${ACCENTS[accent]}`}
    >
      <p className="text-[15px] font-semibold text-muted">{label}</p>
      <p className="mt-1 text-4xl font-extrabold text-ink">{value.toLocaleString("en-PH")}</p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
      <p className="mt-3 text-sm font-bold text-brand group-hover:underline">{action} →</p>
    </Link>
  );
}
