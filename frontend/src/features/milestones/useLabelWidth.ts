import { useSyncExternalStore } from "react";
import { labelWidthOf } from "./gantt";

const media = (query: string) => (typeof window.matchMedia === "function" ? window.matchMedia(query) : null);
const QUERIES = [1024, 1280, 1600] as const;

const subscribe = (listener: () => void) => {
  const lists = QUERIES.map((width) => media(`(min-width: ${width}px)`));
  for (const list of lists) list?.addEventListener("change", listener);
  return () => {
    for (const list of lists) list?.removeEventListener("change", listener);
  };
};

/** REQ-MILESTONE-UI-013: the label column's width in px for the window; 300px where the browser cannot tell (jsdom). */
export const useLabelWidth = (): number =>
  useSyncExternalStore(subscribe, () => {
    const widest = QUERIES.findLast((width) => media(`(min-width: ${width}px)`)?.matches ?? width === 1024);
    return labelWidthOf(widest ?? 0);
  });
