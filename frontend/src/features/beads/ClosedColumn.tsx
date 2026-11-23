import { Button } from "@/components/ui/button";
import type { DefinitionKey } from "@/lib/definitions";
import type { BeadSummary } from "./api";
import type { CardChoice } from "./BeadCard";
import { BoardColumn } from "./BoardColumn";

export function ClosedColumn({
  title,
  rule,
  project,
  beads,
  limit,
  allLabel,
  empty,
  all,
  onAll,
  choice,
}: {
  title: string;
  rule?: DefinitionKey;
  project: string;
  beads: readonly BeadSummary[]; // newest closed first
  limit: number;
  allLabel: (total: number) => string;
  empty: string;
  /** "Show all" is on; the view holds it, so its tab stop knows the drawn cards (REQ-UI-147). */
  all: boolean;
  onAll: (all: boolean) => void;
  choice: CardChoice;
}) {
  const shown = all ? beads : beads.slice(0, limit);
  const toggle =
    beads.length > limit ? (
      <Button variant="outline" size="sm" onClick={() => onAll(!all)}>
        {all ? `Show latest ${limit}` : allLabel(beads.length)}
      </Button>
    ) : null;
  return (
    <BoardColumn title={title} rule={rule} project={project} beads={shown} total={beads.length} empty={empty} footer={toggle} choice={choice} />
  );
}
