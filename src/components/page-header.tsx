export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div className="max-w-2xl">
        <h1 className="serif text-4xl leading-none tracking-tight">{title}</h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
