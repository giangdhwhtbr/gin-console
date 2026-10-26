import type { BeadSummary } from "./api";
import { BoardColumn } from "./BoardColumn";
import { BOARD_COLUMNS, boardColumns, DONE_LIMIT } from "./columns";
import { ClosedColumn } from "./ClosedColumn";
import type { BeadFilters } from "./filters";

export function BoardView({ project, beads, filters }: { project: string; beads: readonly BeadSummary[]; filters: BeadFilters }) {
  const columns = boardColumns(beads);
  return (
    <div className="flex flex-wrap items-start gap-3">
      {BOARD_COLUMNS.map(({ key, title }) =>
        key === "done" ? (
          <ClosedColumn
            key={key}
            title={title}
            project={project}
            beads={columns.done}
            limit={DONE_LIMIT}
            allLabel={(total) => `Show all ${total}`}
            empty={
              filters.closed || (filters.sprint !== "" && filters.sprint !== "none")
                ? "No beads"
                : "Turn on Show closed to see closed beads"
            }
          />
        ) : (
          <BoardColumn key={key} title={title} project={project} beads={columns[key]} />
        ),
      )}
    </div>
  );
}
