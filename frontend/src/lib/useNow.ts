import { useCallback, useState } from "react";
import { useVisibleInterval } from "./useVisibleInterval";

/** The current time in ms, refreshed every `ms` while the page is visible. */
export function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  const tick = useCallback(() => setNow(Date.now()), []);
  useVisibleInterval(tick, ms);
  return now;
}
