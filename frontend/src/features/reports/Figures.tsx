/** A row of report figures: the value large, its label under it. */
export function Figures({ items }: { items: [string, string][] }) {
  if (items.length === 0) return null;
  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-3">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col-reverse">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
