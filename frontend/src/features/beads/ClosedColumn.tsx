import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { BeadSummary } from "./api";
import { BoardColumn } from "./BoardColumn";

export function ClosedColumn({
  title,
  project,
  beads,
  limit,
  allLabel,
  empty,
}: {
  title: string;
  project: string;
  beads: readonly BeadSummary[]; // newest closed first
  limit: number;
  allLabel: (total: number) => string;
  empty: string;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? beads : beads.slice(0, limit);
  const toggle =
    beads.length > limit ? (
      <Button variant="outline" size="sm" onClick={() => setAll(!all)}>
        {all ? `Show latest ${limit}` : allLabel(beads.length)}
      </Button>
    ) : null;
  return (
    <BoardColumn title={title} project={project} beads={shown} total={beads.length} empty={empty} footer={toggle} />
  );
}
