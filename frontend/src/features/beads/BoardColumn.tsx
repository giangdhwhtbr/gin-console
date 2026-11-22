import type { ReactNode } from "react";
import { Hint } from "@/components/ui/tooltip";
import { countHint, type DefinitionKey } from "@/lib/definitions";
import type { BeadSummary } from "./api";
import { BeadCard } from "./BeadCard";
import { isPrep } from "./prep";

// REQ-UI-132: the columns that count blocked, done or in-progress beads say by which rule
const RULE: Readonly<Record<string, DefinitionKey>> = {
  "In Progress": "inProgress",
  "In flight": "inProgress",
  Blocked: "blocked",
  Done: "done",
  "Recently finished": "done",
};

export function BoardColumn({
  title,
  project,
  beads,
  total,
  empty = "No beads",
  footer = null,
}: {
  title: string;
  project: string;
  beads: readonly BeadSummary[];
  total?: number;
  empty?: string;
  footer?: ReactNode;
}) {
  const prep = beads.filter((b) => isPrep(b.labels)).length;
  const own = beads.length - prep;
  const shown = prep === 0 ? String(own) : `${own} + ${prep} prep`;
  const rule = RULE[title];
  const count = total === undefined || total === beads.length ? shown : `${beads.length} of ${total}`;
  return (
    <section aria-label={title} className="flex min-w-48 flex-1 flex-col gap-2 rounded border p-2">
      <h2 className="flex items-baseline justify-between text-sm font-medium">
        {title}
        {rule === undefined ? (
          <span className="text-muted-foreground">{count}</span>
        ) : (
          <Hint text={countHint(rule, "this column")}>
            <span className="text-muted-foreground">{count}</span>
          </Hint>
        )}
      </h2>
      {beads.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {beads.map((bead) => (
            <BeadCard key={bead.id} project={project} bead={bead} />
          ))}
        </ul>
      )}
      {footer}
    </section>
  );
}
