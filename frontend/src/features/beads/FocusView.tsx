import type { BeadSummary } from "./api";
import { BoardColumn } from "./BoardColumn";
import { ClosedColumn } from "./ClosedColumn";
import { closedNewestFirst, FINISHED_LIMIT, FOCUS_COLUMNS, focusRows } from "./columns";
import type { BeadFilters } from "./filters";
import { FocusOptions } from "./FocusOptions";

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
  return (
    <div className="flex flex-col gap-4">
      <FocusOptions filters={filters} onChange={onChange} />
      {rows.map((row) => {
        const columns = (
          <div className="flex flex-wrap items-start gap-3">
            {FOCUS_COLUMNS.map(({ key, title }) => (
              <BoardColumn key={key} title={title} project={project} beads={row.columns[key]} />
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
          project={project}
          beads={closedNewestFirst(beads)}
          limit={FINISHED_LIMIT}
          allLabel={(total) => `Show all ${total} completed`}
          empty={filters.closed ? "No beads" : "Turn on Show closed to see closed beads"}
        />
      )}
    </div>
  );
}
