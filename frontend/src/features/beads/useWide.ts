import { useSyncExternalStore } from "react";

const queryOf = (px: number) => (typeof window.matchMedia === "function" ? window.matchMedia(`(min-width: ${px}px)`) : null);

/** True from `px` wide; true too when the browser cannot tell, so that the wide behaviour is the default. */
export const useMinWidth = (px: number): boolean =>
  useSyncExternalStore(
    (listener) => {
      const media = queryOf(px);
      media?.addEventListener("change", listener);
      return () => media?.removeEventListener("change", listener);
    },
    () => queryOf(px)?.matches ?? true,
  );

/** True from 1024px. */
export const useWide = (): boolean => useMinWidth(1024);
