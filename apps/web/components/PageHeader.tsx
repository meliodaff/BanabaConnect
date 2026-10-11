export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line bg-surface px-8 py-6">
      <div>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-muted">{description}</p>}
      </div>
      {children}
    </header>
  );
}
