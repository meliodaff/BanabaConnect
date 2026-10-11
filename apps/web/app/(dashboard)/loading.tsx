/** Shown while a dashboard page loads, so staff know it's working. */
export default function DashboardLoading() {
  return (
    <div className="px-8 py-6" role="status" aria-live="polite">
      <p className="mb-4 text-[15px] font-semibold text-muted">Loading…</p>
      <div className="space-y-3" aria-hidden>
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-[72px] animate-pulse rounded-lg border border-line bg-surface" />
        ))}
      </div>
    </div>
  );
}
