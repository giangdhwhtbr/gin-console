import { useEffect, useRef, useState } from "react";
import { navigate } from "@/app/route";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { DetailsPanel } from "./DetailsPanel";
import { filterBeads, type BeadFilters } from "./filters";
import { COLUMNS, ListRow } from "./ListRow";
import type { MilestoneInEffect } from "./milestoneChoice";
import { getOrigin, rememberOpen } from "@/app/origin";
import { allBranches, ancestorsOf, keepSet, treeIndex, treeRows } from "./tree";
import { treeKeyDown } from "./treeKeys";
import { useWide } from "./useWide";

export function ListView({
  project,
  beads,
  filters,
  milestone = "all",
  closedMilestone = false,
  onChange,
}: {
  project: string;
  beads: readonly BeadSummary[];
  filters: BeadFilters;
  milestone?: MilestoneInEffect;
  closedMilestone?: boolean;
  onChange: (next: BeadFilters) => void;
}) {
  const wide = useWide();
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(getOrigin().open[project] ?? []));
  const base = beads.filter(
    (b) => filters.closed || closedMilestone || (filters.sprint !== "" && filters.sprint !== "none") || b.status !== "closed",
  );
  const index = treeIndex(base);
  const filtering =
    filters.q.trim() !== "" ||
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.label.length > 0 ||
    filters.type !== "" ||
    filters.kind !== "" ||
    filters.capability.length > 0 ||
    filters.assignee.length > 0 ||
    filters.sprint !== "" ||
    milestone !== "all";
  const keep = filtering
    ? keepSet(index, new Set(filterBeads(beads, { ...filters, closed: filters.closed || closedMilestone }, milestone).map((b) => b.id)))
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

  // closing returns focus to the row that was selected, or to the first row when it is gone
  const closed = useRef<string | null>(null);
  useEffect(() => {
    if (filters.select !== "" || closed.current === null) return;
    const rowsNow = Array.from(document.querySelectorAll<HTMLElement>('[role="tree"] [role="treeitem"]'));
    (rowsNow.find((r) => r.dataset.id === closed.current) ?? rowsNow[0])?.focus();
    closed.current = null;
  }, [filters.select]);
  const close = () => {
    closed.current = filters.select;
    onChange({ ...filters, select: "" });
  };

  return (
    <div className={cn("grid gap-4", filters.select !== "" && "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]")}>
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
              onKeyDown={(event) => treeKeyDown(event, { toggle, select: choose, clear: filters.select === "" ? undefined : close })}
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
      {filters.select !== "" && (
        <DetailsPanel
          project={project}
          id={filters.select}
          note={rows.some((r) => r.bead.id === filters.select) ? undefined : "Not in the current list"}
          className="hidden lg:block"
          onClose={close}
        />
      )}
    </div>
  );
}
