import { useCallback, useEffect, useState } from "react";
import { RequirementsFailure } from "./api";

export type Fetched<T> = { status: "loading" } | { status: "error"; error: RequirementsFailure } | { status: "ok"; data: T };
const asFailure = (error: unknown) => (error instanceof RequirementsFailure ? error : new RequirementsFailure(error instanceof Error ? error.message : String(error), 0));

/** Load once per `fetcher` (memoised by the caller); an answer of an older fetcher is dropped. */
export function useFetched<T>(fetcher: () => Promise<T>): { state: Fetched<T>; retry: () => void } {
  const [held, setHeld] = useState<{ of: () => Promise<T>; state: Fetched<T> } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    void fetcher().then(
      (data) => live && setHeld({ of: fetcher, state: { status: "ok", data } }),
      (error: unknown) => live && setHeld({ of: fetcher, state: { status: "error", error: asFailure(error) } }),
    );
    return () => {
      live = false;
    };
  }, [fetcher, attempt]);
  const retry = useCallback(() => {
    setHeld(null);
    setAttempt((n) => n + 1);
  }, []);
  return { state: held !== null && held.of === fetcher ? held.state : { status: "loading" }, retry };
}
