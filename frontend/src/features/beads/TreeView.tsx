import { useState } from "react";
import type { BeadSummary } from "./api";
import { BeadDetailPage } from "./BeadDetailPage";
import { inLane } from "./columns";
import { filterBeads, type BeadFilters } from "./filters";
import { allBranches, ancestorsOf, keepSet, treeIndex, treeRows } from "./tree";
import { treeKeyDown } from "./treeKeys";
import { TreeRow } from "./TreeRow";
import { TreeToolbar } from "./TreeToolbar";

export function TreeView({
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
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const base = beads.filter((b) => filters.closed || b.status !== "closed");
  const index = treeIndex(base, filters.tree);
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

  const toggle = (id: string, value: boolean) =>
    setOpen((previous) => {
      const next = new Set(previous);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  const select = (id: string) => onChange({ ...filters, select: id });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-3">
        <TreeToolbar
          filters={filters}
          onChange={onChange}
          onExpandAll={() => setOpen(allBranches(index))}
          onCollapseAll={() => setOpen(new Set())}
        />
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No beads match.</p>
        ) : (
          <ul
            role="tree"
            aria-label={`Beads of ${project}`}
            onKeyDown={(event) => treeKeyDown(event, { toggle, select })}
            className="flex flex-col gap-1"
          >
            {rows.map((row) => (
              <TreeRow
                key={row.key}
                row={row}
                mode={filters.tree}
                selected={row.bead.id === filters.select}
                tabStop={row.key === tabStop}
                onToggle={toggle}
                onSelect={select}
              />
            ))}
          </ul>
        )}
        {omitted > 0 && (
          <p className="text-sm text-muted-foreground">{`${omitted}${walkLimited ? "+" : ""} more not shown`}</p>
        )}
      </div>
      <aside aria-label="Bead details" className="min-w-0 rounded border p-3">
        {filters.select === "" ? (
          <p className="text-muted-foreground">Select a bead to see its details</p>
        ) : (
          <div className="flex flex-col gap-2">
            {!rows.some((r) => r.bead.id === filters.select) && (
              <p className="text-sm text-muted-foreground">Not in the current tree</p>
            )}
            <BeadDetailPage key={`${project}/${filters.select}`} project={project} id={filters.select} embedded />
          </div>
        )}
      </aside>
    </div>
  );
}
