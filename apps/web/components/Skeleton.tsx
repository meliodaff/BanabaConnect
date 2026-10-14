/**
 * Loading skeletons: gray shapes laid out like the page that's on its way, so staff see the page
 * taking shape instead of a blank screen. Each page's loading.tsx builds its own from these.
 * Static text (page titles, card titles) is shown for real; only data waits as placeholders.
 */

/** One placeholder shape. Size and shape come from `className` (e.g. "h-4 w-40"). */
export function Bone({ className = "" }: { className?: string }) {
  return <div className={`rounded-md bg-line motion-safe:animate-pulse ${className}`} />;
}

/**
 * The part of a loading page that waits for data. Screen readers hear `label` once; the
 * shapes are hidden from them. They fade in after a short pause (`skeleton-in` in globals.css),
 * so pages that load quickly never flash a skeleton.
 */
export function SkeletonBody({
  label,
  className = "",
  children,
}: {
  /** What screen readers hear, in the staff member's language, e.g. "Loading reports…". */
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden className="skeleton-in">
        {children}
      </div>
    </div>
  );
}

/** Placeholder filter buttons for a page header (the selected one isn't known yet). */
export function TabsSkeleton({ widths }: { widths: string[] }) {
  return (
    <div aria-hidden className="skeleton-in flex flex-wrap gap-2">
      {widths.map((width, index) => (
        <Bone key={index} className={`h-10 rounded-full ${width}`} />
      ))}
    </div>
  );
}

/** A white panel with its real title, like the cards on the report and overview pages. */
export function CardSkeleton({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-5 ${className}`}>
      <h2 className="mb-4 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** Placeholder for a priority badge: the score square and the band name next to it. */
export function PriorityBadgeSkeleton({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div className="flex items-center gap-2.5">
      <Bone className={size === "lg" ? "h-14 w-14 rounded-lg" : "h-10 w-10 rounded-lg"} />
      <Bone className="h-4 w-14" />
    </div>
  );
}
