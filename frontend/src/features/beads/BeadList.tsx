import { useCallback, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useVisibleInterval } from "@/lib/useVisibleInterval";
import { fetchBeads, type BeadSummary } from "./api";
import { BeadFilterBar } from "./BeadFilterBar";
import { BeadTable } from "./BeadTable";
import { filterBeads, optionsOf, sortBeads, type BeadFilters } from "./filters";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; beads: BeadSummary[]; error: string | null };

const REFRESH_MS = 10_000;
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function BeadList({
  project,
  filters,
  onChange,
}: {
  project: string;
  filters: BeadFilters;
  onChange: (next: BeadFilters) => void;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const closed = filters.closed;

  const load = useCallback(() => {
    void fetchBeads(project, closed).then(
      (beads) => setState({ status: "ok", beads, error: null }),
      (error: unknown) =>
        setState((previous) =>
          previous.status === "ok"
            ? { ...previous, error: messageOf(error) }
            : { status: "error", message: messageOf(error) },
        ),
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
          <BeadFilterBar filters={filters} options={optionsOf(beads)} onChange={onChange} />
          <p className="text-sm text-muted-foreground">{`${shown.length} of ${beads.length}`}</p>
          {shown.length === 0 ? (
            <p className="text-muted-foreground">No beads match.</p>
          ) : (
            <BeadTable project={project} beads={shown} />
          )}
        </>
      )}
    </section>
  );
}
