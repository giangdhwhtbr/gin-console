import { useState } from "react";
import type { BeadSummary } from "./api";
import { BoardColumn } from "./BoardColumn";
import { BOARD_COLUMNS, boardColumns, DONE_LIMIT } from "./columns";
import { ClosedColumn } from "./ClosedColumn";
import type { BeadFilters } from "./filters";
import { useCardChoice } from "./useCardChoice";

export function BoardView({
  project,
  beads,
  filters,
  onChange,
}: {
  project: string;
  beads: readonly BeadSummary[];
  filters: BeadFilters;
  onChange: (next: BeadFilters) => void;
}) {
  const columns = boardColumns(beads);
  const [allDone, setAllDone] = useState(false);
  const drawn = BOARD_COLUMNS.flatMap(({ key }) =>
    (key === "done" && !allDone ? columns.done.slice(0, DONE_LIMIT) : columns[key]).map((b) => b.id),
  );
  const { choice } = useCardChoice({ project, filters, drawn, onChange });
  return (
    <div className="flex flex-wrap items-start gap-3">
      {BOARD_COLUMNS.map(({ key, title, rule }) =>
        key === "done" ? (
          <ClosedColumn
            key={key}
            title={title}
            rule={rule}
            project={project}
            beads={columns.done}
            limit={DONE_LIMIT}
            allLabel={(total) => `Show all ${total}`}
            empty={
              filters.closed || (filters.sprint !== "" && filters.sprint !== "none")
                ? "No beads"
                : "Turn on Show closed to see closed beads"
            }
            all={allDone}
            onAll={setAllDone}
            choice={choice}
          />
        ) : (
          <BoardColumn key={key} title={title} rule={rule} project={project} beads={columns[key]} choice={choice} />
        ),
      )}
    </div>
  );
}
