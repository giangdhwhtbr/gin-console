import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchReopens } from "./api";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; reopens: number };

/** The bead page's reopen count: nothing while it loads or when it is 0, never a guessed 0. */
export function Reopens({ project, id }: { project: string; id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void fetchReopens(project, id).then(
      (reopens) => setState({ status: "ok", reopens }),
      (error: unknown) =>
        setState({ status: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  }, [project, id, attempt]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  };

  if (state.status === "error") {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        {` · Reopens unavailable: ${state.message}`}
        <Button variant="outline" size="xs" onClick={retry}>
          Retry
        </Button>
      </span>
    );
  }
  if (state.status === "ok" && state.reopens > 0) {
    return (
      <span>
        {" · "}
        <span className="text-type-bug">{`Reopened ${state.reopens} ${state.reopens === 1 ? "time" : "times"}`}</span>
      </span>
    );
  }
  return null;
}
