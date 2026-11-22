import { Hint } from "@/components/ui/tooltip";

/** A row of report figures: the value large, its label under it; a hint, when given for a label, explains the value. */
export function Figures({ items, hints = {} }: { items: [string, string][]; hints?: Readonly<Record<string, string>> }) {
  if (items.length === 0) return null;
  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-3">
      {items.map(([label, value]) => {
        const hint = hints[label];
        return (
          <div key={label} className="flex flex-col-reverse">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            {hint === undefined ? (
              <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            ) : (
              <Hint text={hint}>
                <dd tabIndex={0} className="w-fit rounded text-2xl font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-ring">
                  {value}
                </dd>
              </Hint>
            )}
          </div>
        );
      })}
    </dl>
  );
}
