/**
 * The parts the printed documents share (the incident report and the monthly report), so they
 * look like one set of barangay papers. Made for black-and-white printers: nothing depends on
 * color, and browsers leave background colors out of printouts.
 */

/** The seal, the barangay's name and the document's title, with details in the top-right corner. */
export function DocumentHeader({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-6 border-b-2 border-ink pb-4">
      <div className="flex items-center gap-3">
        {/* The original file, so the seal prints sharp. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/barangay-banaba-seal.jpg"
          alt="Seal of Barangay Banaba, San Mateo, Rizal"
          className="h-[15mm] w-[15mm] shrink-0 rounded-full"
        />
        <div>
          <p className="font-display text-base font-bold leading-tight">Barangay Banaba</p>
          <p className="text-muted">San Mateo, Rizal</p>
          <h1 className="mt-1 text-xl font-bold">{title}</h1>
        </div>
      </div>
      <dl className="shrink-0 text-right">{children}</dl>
    </header>
  );
}

/** One "label value" line in the header's top-right corner, e.g. "Report no. 3F2A9C1D". */
export function HeaderDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="inline text-muted">{label} </dt>
      <dd className="inline">{children}</dd>
    </div>
  );
}

/**
 * A titled part of the document. It moves to the next page whole rather than splitting, unless
 * it's a long list (`keepTogether={false}`) that should continue across pages.
 */
export function DocumentSection({
  title,
  keepTogether = true,
  className = "",
  children,
}: {
  title: string;
  keepTogether?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${keepTogether ? "break-inside-avoid" : ""} ${className}`}>
      <h2 className="mb-1.5 border-b border-ink/40 pb-1 text-xs font-bold uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

/** A label and its value, inside a <dl>. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-3 py-0.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

/** A smaller line under a value, e.g. how the priority adds up. */
export function Note({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs font-normal text-muted">{children}</span>;
}

/**
 * Lines to sign (e.g. "Prepared by"), then where the document came from. Kept together, so a
 * long document never leaves them alone on a page.
 */
export function SignatureFooter({
  lines,
  source,
}: {
  lines: { label: string; caption?: string }[];
  source: React.ReactNode;
}) {
  return (
    <footer className="mt-8 break-inside-avoid">
      <div className="grid grid-cols-2 gap-x-12">
        {lines.map((line) => (
          <div key={line.label}>
            <p className="text-muted">{line.label}</p>
            <div className="mt-8 border-t border-ink pt-1 text-[11px] text-muted">{line.caption}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-[11px] text-muted">{source}</p>
    </footer>
  );
}
