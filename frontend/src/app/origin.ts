import { useMemo, useSyncExternalStore } from "react";

export const RETURN_KEY = "gin-console-beads-return";
const KINDS = ["overview", "beads", "milestone", "my-tasks", "reports"] as const;
export type OriginKind = (typeof KINDS)[number];
/** The milestone in effect on a remembered Beads place, and the one in effect without `milestone` in its URL (REQ-UI-072, REQ-UI-143). */
export type OriginMilestone = { inEffect: string; byDefault: string };
/** The page a bead was opened from, which the breadcrumb and the navigation of a bead page return to.
 *  `project` is null for the Overview, which belongs to no project, and for nothing remembered yet. `label` is a milestone's title. */
export type Origin = { kind: OriginKind; path: string; search: string; project: string | null; label: string | null; milestone: OriginMilestone | null; open: Record<string, string[]> };

const empty = (): Origin => ({ kind: "beads", path: "/beads", search: "", project: null, label: null, milestone: null, open: {} }); // a fresh object each time: callers may not share it

function milestoneOf(value: unknown): OriginMilestone | null {
  if (typeof value !== "object" || value === null) return null;
  const inEffect: unknown = Reflect.get(value, "inEffect");
  const byDefault: unknown = Reflect.get(value, "byDefault");
  return typeof inEffect === "string" && typeof byDefault === "string" ? { inEffect, byDefault } : null;
}
const listeners = new Set<() => void>();
let memory: string | null = null; // what was set in this visit: wins over storage, which may refuse writes

function raw(): string {
  if (memory !== null) return memory;
  try {
    return window.sessionStorage.getItem(RETURN_KEY) ?? "";
  } catch {
    return ""; // storage refused: nothing is remembered yet
  }
}

function isLists(value: unknown): value is Record<string, string[]> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((list) => Array.isArray(list) && list.every((id) => typeof id === "string"))
  );
}

const kindOf = (value: unknown): OriginKind | null => KINDS.find((kind) => kind === value) ?? null;

function parse(text: string): Origin {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null) return empty();
    const path: unknown = Reflect.get(value, "path");
    const search: unknown = Reflect.get(value, "search");
    const open: unknown = Reflect.get(value, "open");
    const kind = kindOf(Reflect.get(value, "kind"));
    const project: unknown = Reflect.get(value, "project");
    const label: unknown = Reflect.get(value, "label");
    if (typeof search !== "string" || !isLists(open)) return empty();
    if (typeof path === "string" && (!path.startsWith("/") || path.startsWith("//"))) return empty(); // never a place outside this app
    const shown = typeof path === "string" ? path : "/beads";
    // a value stored before kinds existed is a Beads place, whose project is in its query
    const old = kind === null ? new URLSearchParams(search).get("project") : null;
    return {
      kind: kind ?? "beads",
      path: shown,
      search,
      project: kind === null ? old : typeof project === "string" ? project : null,
      label: typeof label === "string" ? label : null,
      milestone: milestoneOf(Reflect.get(value, "milestone")),
      open,
    };
  } catch {
    return empty(); // empty or damaged text
  }
}

export const getOrigin = (): Origin => parse(raw());

function save(next: Origin): void {
  const text = JSON.stringify(next);
  memory = text;
  try {
    window.sessionStorage.setItem(RETURN_KEY, text);
  } catch {
    // storage refused: `memory` holds it for this visit
  }
  listeners.forEach((listener) => listener());
}

/** The page the breadcrumb and the navigation of a bead page return to. */
export function rememberOrigin(kind: OriginKind, path: string, search: string, project: string | null, label: string | null = null, milestone: OriginMilestone | null = null): void {
  const now = getOrigin();
  const sameMilestone = now.milestone?.inEffect === milestone?.inEffect && now.milestone?.byDefault === milestone?.byDefault;
  if (now.kind !== kind || now.path !== path || now.search !== search || now.project !== project || now.label !== label || !sameMilestone) {
    save({ ...now, kind, path, search, project, label, milestone });
  }
}

/** The origin when it is the Overview (beads of any project) or a place of the bead's project, else null. */
export function originFor(beadProject: string, origin: Origin): Origin | null {
  return origin.kind === "overview" || origin.project === beadProject ? origin : null;
}

export function rememberOpen(project: string, ids: readonly string[]): void {
  const now = getOrigin();
  save({ ...now, open: { ...now.open, [project]: [...ids] } });
}

export function clearOrigin(): void {
  memory = null;
  try {
    window.sessionStorage.removeItem(RETURN_KEY);
  } catch {
    // storage refused: nothing to remove
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useOrigin(): Origin {
  const text = useSyncExternalStore(subscribe, raw);
  return useMemo(() => parse(text), [text]);
}
