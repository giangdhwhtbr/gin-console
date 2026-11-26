import { useSyncExternalStore } from "react";
import type { Section } from "./paths";

/** `count` is null while the number is unknown. */
export type SectionLink = { section: Section; label: string; count: number | null; href: string };
type Snapshot = { sections: readonly SectionLink[]; selected: Section | null };

const EMPTY: Snapshot = { sections: [], selected: null };
let snapshot = EMPTY;
const listeners = new Set<() => void>();

const same = (a: readonly SectionLink[], b: readonly SectionLink[]) =>
  a.length === b.length && a.every((s, i) => s.section === b[i].section && s.label === b[i].label && s.count === b[i].count && s.href === b[i].href);

function set(next: Snapshot): void {
  if (next.selected === snapshot.selected && same(next.sections, snapshot.sections)) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

/** The sections the Requirements page offers, for the sidebar to list (REQ-REQUIREMENTS-012). */
export const publishSections = (sections: readonly SectionLink[], selected: Section): void => set({ sections, selected });
export const clearSections = (): void => set(EMPTY);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useRequirementSections = (): Snapshot => useSyncExternalStore(subscribe, () => snapshot);
