import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { BoardColumn } from "./BoardColumn";
import { BOARD_COLUMNS, boardColumns, DONE_LIMIT } from "./columns";
import { ClosedColumn } from "./ClosedColumn";
import { DetailsPanel } from "./DetailsPanel";
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
  const { choice, close } = useCardChoice({ project, filters, drawn, onChange });
  return (
    <div className={cn("grid gap-4", choice.selected !== "" && "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]")}>
      <div className="flex min-w-0 flex-wrap items-start gap-3">
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
      {choice.selected !== "" && (
        <DetailsPanel
          project={project}
          id={choice.selected}
          note={drawn.includes(choice.selected) ? undefined : "Not in the current list"}
          onClose={close}
        />
      )}
    </div>
  );
}
