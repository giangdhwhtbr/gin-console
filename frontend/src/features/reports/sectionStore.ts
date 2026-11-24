import { useSyncExternalStore } from "react";
import type { ReportSection } from "./sections";

export type SectionLink = { section: ReportSection; label: string; headline: string; warn: boolean; href: string };
type Snapshot = { sections: readonly SectionLink[]; selected: ReportSection | null };

const EMPTY: Snapshot = { sections: [], selected: null };
let snapshot = EMPTY;
const listeners = new Set<() => void>();

const same = (a: readonly SectionLink[], b: readonly SectionLink[]) =>
  a.length === b.length && a.every((s, i) => s.section === b[i].section && s.label === b[i].label && s.headline === b[i].headline && s.warn === b[i].warn && s.href === b[i].href);

function set(next: Snapshot): void {
  if (next.selected === snapshot.selected && same(next.sections, snapshot.sections)) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

/** The report sections the Reports page offers, for the sidebar to list (REQ-UI-129). */
export const publishSections = (sections: readonly SectionLink[], selected: ReportSection): void => set({ sections, selected });
export const clearSections = (): void => set(EMPTY);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useSections = (): Snapshot => useSyncExternalStore(subscribe, () => snapshot);
