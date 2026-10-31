import { useEffect } from "react";

/** Run `callback` now and, unless `ms` is null, every `ms` while the page is visible and again when it becomes visible. */
export function useVisibleInterval(callback: () => void, ms: number | null): void {
  useEffect(() => {
    callback();
    if (ms === null) return;
    const tick = () => {
      if (document.visibilityState === "visible") callback();
    };
    const timer = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [callback, ms]);
}
