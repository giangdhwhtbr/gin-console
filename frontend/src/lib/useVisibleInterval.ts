import { useEffect } from "react";

/** Run `callback` now and every `ms` while the page is visible; run it again when it becomes visible. */
export function useVisibleInterval(callback: () => void, ms: number): void {
  useEffect(() => {
    callback();
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
