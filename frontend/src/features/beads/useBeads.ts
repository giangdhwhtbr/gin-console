import { useCallback, useRef, useState } from "react";
import { useVisibleInterval } from "@/lib/useVisibleInterval";
import { fetchBeads, type BeadSummary } from "./api";

export type BeadsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; beads: BeadSummary[]; error: string | null };

const REFRESH_MS = 10_000;
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The beads of a project, refreshed every 10 s while the page is visible; a later answer always wins. */
export function useBeads(project: string, closed: boolean): { state: BeadsState; retry: () => void } {
  const [state, setState] = useState<BeadsState>({ status: "loading" });
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

  return { state, retry };
}
