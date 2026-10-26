import { useCallback } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BeadFilterBar } from "./BeadFilterBar";
import { BoardView } from "./BoardView";
import { filterBeads, optionsOf, sortBeads, type BeadFilters } from "./filters";
import { FocusView } from "./FocusView";
import { ListView } from "./ListView";
import { useBeads } from "./useBeads";
import { useCardKeys } from "./useCardKeys";
import { ViewTabs } from "./ViewTabs";

export function BeadsView({
  project,
  filters,
  onChange,
}: {
  project: string;
  filters: BeadFilters;
  onChange: (next: BeadFilters) => void;
}) {
  const clearSearch = useCallback(() => onChange({ ...filters, q: "" }), [filters, onChange]);
  useCardKeys(true, clearSearch, filters.view !== "list");

  const { state, retry } = useBeads(project, filters.closed || (filters.sprint !== "" && filters.sprint !== "none"));

  const errorMessage = state.status === "error" ? state.message : state.status === "ok" ? state.error : null;
  const beads = state.status === "ok" ? state.beads : [];
  const shown = sortBeads(filterBeads(beads, filters));

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
      {state.status === "ok" && (
        <>
          <ViewTabs filters={filters} onChange={onChange} />
          <BeadFilterBar filters={filters} options={optionsOf(beads)} onChange={onChange} />
          <p className="text-sm text-muted-foreground">{`${shown.length} of ${beads.length}`}</p>
          {filters.view === "board" && <BoardView project={project} beads={shown} filters={filters} />}
          {filters.view === "focus" && (
            <FocusView project={project} beads={shown} filters={filters} onChange={onChange} />
          )}
          {filters.view === "list" && (
            <ListView project={project} beads={beads} filters={filters} onChange={onChange} />
          )}
        </>
      )}
    </section>
  );
}
