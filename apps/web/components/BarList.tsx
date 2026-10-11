/**
 * Horizontal bars for comparing a few counts, e.g. active reports by type. One color for every
 * bar (the categories have no order, so a darker-for-bigger ramp would only repeat the length),
 * and the number is written beside each bar, so nothing depends on hovering.
 */
export function BarList({ label, rows }: { label: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul aria-label={label} className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[8.5rem_minmax(0,1fr)_2.5rem] items-center gap-3">
          <span className="truncate text-[15px]" title={row.label}>
            {row.label}
          </span>
          <span className="h-4" aria-hidden>
            <span
              className="block h-4 rounded-r bg-brand"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
            />
          </span>
          <span className="text-right text-[15px] font-bold tabular-nums">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}
