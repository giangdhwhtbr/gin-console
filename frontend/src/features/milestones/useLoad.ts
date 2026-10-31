import { useCallback, useRef, useState } from "react";
import { useVisibleInterval } from "@/lib/useVisibleInterval";
import { MilestonesError } from "./api";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; error: MilestonesError }
  | { status: "ok"; data: T; error: MilestonesError | null; stale: boolean };

const REFRESH_MS = 10_000;
const asError = (error: unknown) =>
  error instanceof MilestonesError ? error : new MilestonesError(error instanceof Error ? error.message : String(error));

/**
 * Load with `fetcher` (memoised by the caller), every 10 s while the page is visible when `poll`.
 * A new fetcher marks the last answer `stale` and, if it fails, shows the error instead of that answer;
 * a failed refresh of the same fetcher keeps the last answer with `error` set. A later request always wins.
 */
export function useLoad<T>(fetcher: () => Promise<T>, poll: boolean): { state: LoadState<T>; retry: () => void } {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  const latest = useRef(0);
  const answered = useRef<(() => Promise<T>) | null>(null);

  const load = useCallback(() => {
    latest.current += 1;
    const id = latest.current;
    const fresh = answered.current !== fetcher;
    if (fresh) setState((prev) => (prev.status === "ok" ? { ...prev, stale: true } : { status: "loading" }));
    void fetcher().then(
      (data) => {
        if (id !== latest.current) return;
        answered.current = fetcher;
        setState({ status: "ok", data, error: null, stale: false });
      },
      (error: unknown) => {
        if (id !== latest.current) return;
        const failed = asError(error);
        setState((prev) => (prev.status === "ok" && !fresh ? { ...prev, error: failed } : { status: "error", error: failed }));
      },
    );
  }, [fetcher]);

  useVisibleInterval(load, poll ? REFRESH_MS : null);

  const retry = () => {
    if (state.status === "error") setState({ status: "loading" });
    load();
  };
  return { state, retry };
}
