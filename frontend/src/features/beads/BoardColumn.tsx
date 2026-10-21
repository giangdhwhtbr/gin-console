import type { ReactNode } from "react";
import type { BeadSummary } from "./api";
import { BeadCard } from "./BeadCard";

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
  const count = total === undefined || total === beads.length ? String(beads.length) : `${beads.length} of ${total}`;
  return (
    <section aria-label={title} className="flex min-w-48 flex-1 flex-col gap-2 rounded border p-2">
      <h2 className="flex items-baseline justify-between text-sm font-medium">
        {title}
        <span className="text-muted-foreground">{count}</span>
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
