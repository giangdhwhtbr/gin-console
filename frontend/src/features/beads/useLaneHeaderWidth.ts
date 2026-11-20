import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1024px)";
const media = () => (typeof window.matchMedia === "function" ? window.matchMedia(QUERY) : null);

const subscribe = (listener: () => void) => {
  const list = media();
  list?.addEventListener("change", listener);
  return () => list?.removeEventListener("change", listener);
};

/** REQ-UI-111: the lane header column's width in px: 168 under 1024px windows, 240 from 1024; 240 where the browser cannot tell (jsdom). */
export const useLaneHeaderWidth = (): number =>
  useSyncExternalStore(subscribe, () => ((media()?.matches ?? true) ? 240 : 168));
