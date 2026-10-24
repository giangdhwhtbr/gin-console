import { useState } from "react";
import { navigate } from "@/app/route";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { BeadDetailPage } from "./BeadDetailPage";
import { inLane } from "./columns";
import { filterBeads, type BeadFilters } from "./filters";
import { COLUMNS, ListRow } from "./ListRow";
import { getReturn, rememberOpen } from "./returnState";
import { SIDE_PANEL } from "./side-panel";
import { allBranches, ancestorsOf, keepSet, treeIndex, treeRows } from "./tree";
import { treeKeyDown } from "./treeKeys";
import { useWide } from "./useWide";

export function ListView({
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
  const wide = useWide();
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(getReturn().open[project] ?? []));
  const base = beads.filter((b) => filters.closed || b.status !== "closed");
  const index = treeIndex(base);
  const filtering =
    filters.q.trim() !== "" ||
    filters.status !== "" ||
    filters.priority !== "" ||
    filters.label !== "" ||
    filters.type !== "" ||
    filters.lane !== "";
  const keep = filtering
    ? keepSet(index, new Set(inLane(filterBeads(beads, filters), filters.lane).map((b) => b.id)))
    : null;
  // a branch is open when the user opened it, when it leads to a match, or when it holds the selection
  const shownOpen = new Set<string>([
    ...open,
    ...(keep ?? []),
    ...(filters.select === "" ? [] : ancestorsOf(index, filters.select)),
  ]);
  const { rows, omitted, walkLimited } = treeRows(index, shownOpen, keep);
  const tabStop = rows.find((r) => r.bead.id === filters.select)?.key ?? rows[0]?.key;

  const remember = (next: ReadonlySet<string>) => {
    setOpen(next);
    rememberOpen(project, [...next]);
  };
  const toggle = (id: string, value: boolean) => {
    const next = new Set(open);
    if (value) next.add(id);
    else next.delete(id);
    remember(next);
  };
  // from 1024px a click selects the row and fills the panel; narrower, it opens the bead page
  const choose = (id: string) =>
    wide
      ? onChange({ ...filters, select: id })
      : navigate(`/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}`);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="@container flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => remember(allBranches(index))}>
            Expand all
          </Button>
          <Button size="sm" variant="outline" onClick={() => remember(new Set())}>
            Collapse all
          </Button>
        </div>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No beads match.</p>
        ) : (
          <>
            <div
              aria-hidden
              className={cn("hidden gap-x-3 px-2 text-xs font-medium text-muted-foreground @2xl:grid", COLUMNS)}
            >
              <span>Title</span>
              <span>State</span>
              <span>Type</span>
              <span>P</span>
              <span>Activity</span>
              <span className="hidden @4xl:block">Assignee</span>
              <span className="hidden @4xl:block">Updated</span>
            </div>
            <ul
              role="tree"
              aria-label={`Beads of ${project}`}
              onKeyDown={(event) => treeKeyDown(event, { toggle, select: choose })}
              className="flex flex-col gap-1"
            >
              {rows.map((row) => (
                <ListRow
                  key={row.key}
                  project={project}
                  row={row}
                  selected={row.bead.id === filters.select}
                  tabStop={row.key === tabStop}
                  onToggle={toggle}
                  onSelect={choose}
                />
              ))}
            </ul>
          </>
        )}
        {omitted > 0 && (
          <p className="text-sm text-muted-foreground">{`${omitted}${walkLimited ? "+" : ""} more not shown`}</p>
        )}
      </div>
      <aside aria-label="Bead details" tabIndex={0} className={cn("hidden min-w-0 rounded border p-3 lg:block", SIDE_PANEL)}>
        {filters.select === "" ? (
          <p className="text-muted-foreground">Select a bead to see its details</p>
        ) : (
          <div className="flex flex-col gap-2">
            {!rows.some((r) => r.bead.id === filters.select) && (
              <p className="text-sm text-muted-foreground">Not in the current list</p>
            )}
            <BeadDetailPage key={`${project}/${filters.select}`} project={project} id={filters.select} embedded />
          </div>
        )}
      </aside>
    </div>
  );
}
