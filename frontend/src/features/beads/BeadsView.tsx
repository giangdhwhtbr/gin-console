import { useCallback, useMemo } from "react";
import { useRestoreOnBack } from "@/app/route";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BeadFilterBar } from "./BeadFilterBar";
import { BoardView } from "./BoardView";
import { filterBeads, optionsOf, sortBeads, type BeadFilters } from "./filters";
import { FocusView } from "./FocusView";
import { GraphView } from "./GraphView";
import { LanesView } from "./LanesView";
import { ListView } from "./ListView";
import { hasChildren } from "./graph";
import { hasLanes } from "./lanes";
import { scopeOf } from "./scope";
import { withoutMergeGates } from "./mergeGates";
import { isClosedMilestone, milestoneInEffect } from "./milestoneChoice";
import { useBeads } from "./useBeads";
import { useCardKeys } from "./useCardKeys";
import { useMilestones } from "./useMilestones";
import { ViewTabs } from "./ViewTabs";

export function BeadsView({
  project,
  filters: asked,
  fixedMilestone,
  fixed,
  onChange,
}: {
  project: string;
  filters: BeadFilters;
  /** A milestone page: this milestone is in effect and cannot be changed here. */
  fixedMilestone?: string;
  /** An epic page's Graph or Lanes tab: the view and its scope are fixed, so there are no view tabs, milestone filter or scope trail (REQ-UI-119). */
  fixed?: { view: "graph" | "lanes"; scope: string };
  onChange: (next: BeadFilters) => void;
}) {
  const fixedView = fixed?.view;
  const fixedScope = fixed?.scope;
  const filters = useMemo(
    () => (fixedView === undefined || fixedScope === undefined ? asked : { ...asked, view: fixedView, scope: fixedScope, milestone: "all" }),
    [asked, fixedView, fixedScope],
  );
  const clearSearch = useCallback(() => onChange({ ...filters, q: "" }), [filters, onChange]);
  useCardKeys(true, clearSearch, filters.view !== "list");

  const milestones = useMilestones(project);
  const milestone = fixedMilestone ?? milestoneInEffect(filters.milestone, milestones);
  const closedMilestone = isClosedMilestone(milestone, milestones);
  const { state, retry } = useBeads(
    project,
    filters.closed || fixed !== undefined || filters.view === "lanes" || (filters.sprint !== "" && filters.sprint !== "none") || closedMilestone,
    true,
  );

  useRestoreOnBack(state.status === "ok");

  const errorMessage = state.status === "error" ? state.message : state.status === "ok" ? state.error : null;
  const loaded = state.status === "ok" ? state.beads : [];
  // Milestone beads only serve the Graph view's milestone scope (REQ-MILESTONE-UI-006, -009).
  // Merge gates are not work: only the Graph keeps them (REQ-UI-116).
  const withGates = loaded.filter((b) => b.issue_type !== "milestone");
  const beads = withoutMergeGates(withGates);
  const withClosed = { ...filters, closed: filters.closed || closedMilestone };
  const shown = sortBeads(filterBeads(beads, withClosed, milestone));
  // Beads outside the milestone stay in the graph, so the milestone filters only the project scope.
  const matchedMilestone = milestone === "all" || milestone === "none" ? milestone : "all";
  const matched = filterBeads(withGates, withClosed, matchedMilestone);

  const lanesMatched = filters.view === "lanes" ? filterBeads(beads, { ...withClosed, closed: true }, matchedMilestone) : [];

  return (
    <section className="flex flex-col gap-4">
      {state.status === "loading" && <p className="text-muted-foreground">Loading beads…</p>}
      {errorMessage !== null && (
        <Alert variant="destructive">
          <AlertTitle>Beads could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {state.status === "ok" && fixed !== undefined && !hasChildren(loaded, fixed.scope) && <p className="text-muted-foreground">No tracks</p>}
      {state.status === "ok" && (fixed === undefined || hasChildren(loaded, fixed.scope)) && (
        <>
          {fixed === undefined && (
            <ViewTabs filters={filters} lanes={hasLanes(loaded, scopeOf(loaded, filters, milestone))} onChange={onChange} />
          )}
          <BeadFilterBar
            filters={filters}
            options={optionsOf(beads)}
            milestones={milestones}
            milestone={milestone}
            hideMilestone={fixedMilestone !== undefined || fixed !== undefined}
            onChange={onChange}
          />
          {fixed === undefined && <p className="text-sm text-muted-foreground">{`${shown.length} of ${beads.length}`}</p>}
          {filters.view === "graph" && (
            <GraphView
              project={project}
              beads={loaded}
              matched={matched}
              milestone={milestone}
              filters={filters}
              trail={fixed === undefined}
              onChange={onChange}
            />
          )}
          {filters.view === "lanes" && (
            <LanesView
              project={project}
              beads={loaded}
              matched={lanesMatched}
              milestone={milestone}
              filters={filters}
              trail={fixed === undefined}
              onChange={onChange}
            />
          )}
          {filters.view === "board" && <BoardView project={project} beads={shown} filters={filters} />}
          {filters.view === "focus" && (
            <FocusView project={project} beads={shown} filters={filters} onChange={onChange} />
          )}
          {filters.view === "list" && (
            <ListView
              project={project}
              beads={beads}
              filters={filters}
              milestone={milestone}
              closedMilestone={closedMilestone}
              onChange={onChange}
            />
          )}
        </>
      )}
    </section>
  );
}
