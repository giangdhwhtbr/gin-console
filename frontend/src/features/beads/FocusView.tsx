import { useState } from "react";
import type { BeadSummary } from "./api";
import { BoardColumn } from "./BoardColumn";
import { ClosedColumn } from "./ClosedColumn";
import { closedNewestFirst, FINISHED_LIMIT, FOCUS_COLUMNS, focusRows } from "./columns";
import type { BeadFilters } from "./filters";
import { FocusOptions } from "./FocusOptions";
import { useCardChoice } from "./useCardChoice";

export function FocusView({
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
  const rows = focusRows(beads, filters.group);
  const finished = filters.finished ? closedNewestFirst(beads) : [];
  const [allFinished, setAllFinished] = useState(false);
  const drawn = [
    ...rows.flatMap((row) => FOCUS_COLUMNS.flatMap(({ key }) => row.columns[key].map((b) => b.id))),
    ...(allFinished ? finished : finished.slice(0, FINISHED_LIMIT)).map((b) => b.id),
  ];
  const { choice } = useCardChoice({ project, filters, drawn, onChange });
  return (
    <div className="flex flex-col gap-4">
      <FocusOptions filters={filters} onChange={onChange} />
      {rows.map((row) => {
        const columns = (
          <div className="flex flex-wrap items-start gap-3">
            {FOCUS_COLUMNS.map(({ key, title, rule }) => (
              <BoardColumn key={key} title={title} rule={rule} project={project} beads={row.columns[key]} choice={choice} />
            ))}
          </div>
        );
        return row.title === null ? (
          <div key="all">{columns}</div>
        ) : (
          <section key={row.title} aria-label={row.title} className="flex flex-col gap-2">
            <h2 className="font-medium">{row.title}</h2>
            {columns}
          </section>
        );
      })}
      {filters.finished && (
        <ClosedColumn
          title="Recently finished"
          rule="done"
          project={project}
          beads={finished}
          limit={FINISHED_LIMIT}
          allLabel={(total) => `Show all ${total} completed`}
          empty={
            filters.closed || (filters.sprint !== "" && filters.sprint !== "none")
              ? "No beads"
              : "Turn on Show closed to see closed beads"
          }
          all={allFinished}
          onAll={setAllFinished}
          choice={choice}
        />
      )}
    </div>
  );
}
