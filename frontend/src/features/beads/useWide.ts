import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1024px)";
const query = () => (typeof window.matchMedia === "function" ? window.matchMedia(QUERY) : null);

const subscribe = (listener: () => void) => {
  const media = query();
  media?.addEventListener("change", listener);
  return () => media?.removeEventListener("change", listener);
};

/** True from 1024px; true too when the browser cannot tell, so that the wide behaviour is the default. */
export const useWide = (): boolean => useSyncExternalStore(subscribe, () => query()?.matches ?? true);
