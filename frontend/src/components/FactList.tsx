import type { ReactNode } from "react";
import { Hint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type Fact = { label: string; value: ReactNode; title?: string; hint?: string };

/** REQ-UI-110: facts about one thing as label/value pairs, the label muted and the value in the text colour, heavier. */
export function FactList({ facts, layout = "grid" }: { facts: readonly Fact[]; layout?: "grid" | "inline" }) {
  return (
    <dl
      className={cn(
        layout === "grid"
          ? "grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-x-4 gap-y-2"
          : "flex flex-wrap items-baseline gap-x-4 gap-y-1",
      )}
    >
      {facts.map((fact) => (
        <div key={fact.label} className={cn("min-w-0", layout === "inline" && "flex max-w-full items-baseline gap-1.5")}>
          {fact.hint === undefined ? (
            <dt className="text-xs text-muted-foreground">{fact.label}</dt>
          ) : (
            <Hint text={fact.hint}>
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
            </Hint>
          )}
          <dd className="min-w-0 truncate text-sm font-medium text-foreground" title={fact.title ?? (typeof fact.value === "string" ? fact.value : undefined)}>
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
