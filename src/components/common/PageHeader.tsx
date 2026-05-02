export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border/60 bg-card/40 p-4 md:p-5">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary/80">Panel administrativo</p>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="pt-1">{action}</div>
    </header>
  );
}
