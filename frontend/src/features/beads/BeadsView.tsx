import { useCallback, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useVisibleInterval } from "@/lib/useVisibleInterval";
import { fetchBeads, type BeadSummary } from "./api";
import { BeadFilterBar } from "./BeadFilterBar";
import { BoardView } from "./BoardView";
import { inLane } from "./columns";
import { filterBeads, optionsOf, sortBeads, type BeadFilters } from "./filters";
import { FocusView } from "./FocusView";
import { GraphView } from "./GraphView";
import { ListView } from "./ListView";
import { useCardKeys } from "./useCardKeys";
import { ViewTabs } from "./ViewTabs";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; beads: BeadSummary[]; error: string | null };

const REFRESH_MS = 10_000;
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

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
  useCardKeys(true, clearSearch, filters.view !== "list" && filters.view !== "graph");

  const [state, setState] = useState<State>({ status: "loading" });
  const closed = filters.closed;
  const latest = useRef(0);

  const load = useCallback(() => {
    latest.current += 1;
    const id = latest.current;
    void fetchBeads(project, closed).then(
      (beads) => {
        if (id === latest.current) setState({ status: "ok", beads, error: null });
      },
      (error: unknown) => {
        if (id !== latest.current) return;
        setState((previous) =>
          previous.status === "ok"
            ? { ...previous, error: messageOf(error) }
            : { status: "error", message: messageOf(error) },
        );
      },
    );
  }, [project, closed]);

  useVisibleInterval(load, REFRESH_MS);

  const retry = () => {
    if (state.status === "error") setState({ status: "loading" });
    load();
  };

  const errorMessage = state.status === "error" ? state.message : state.status === "ok" ? state.error : null;
  const beads = state.status === "ok" ? state.beads : [];
  const shown = sortBeads(filterBeads(beads, filters));
  const scoped = inLane(shown, filters.lane);

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
          {filters.view === "board" && <BoardView project={project} beads={scoped} filters={filters} />}
          {filters.view === "focus" && (
            <FocusView project={project} beads={scoped} filters={filters} onChange={onChange} />
          )}
          {filters.view === "graph" && (
            <GraphView project={project} beads={beads} filters={filters} onChange={onChange} />
          )}
          {filters.view === "list" && (
            <ListView project={project} beads={beads} filters={filters} onChange={onChange} />
          )}
        </>
      )}
    </section>
  );
}
