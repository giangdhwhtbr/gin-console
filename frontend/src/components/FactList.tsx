import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Fact = { label: string; value: ReactNode; title?: string };

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
        <div key={fact.label} className={cn("min-w-0", layout === "inline" && "flex items-baseline gap-1.5")}>
          <dt className="text-xs text-muted-foreground">{fact.label}</dt>
          <dd className="min-w-0 truncate text-sm font-medium text-foreground" title={fact.title ?? (typeof fact.value === "string" ? fact.value : undefined)}>
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
