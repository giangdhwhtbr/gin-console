import { useMemo, useSyncExternalStore } from "react";

export const RETURN_KEY = "gin-console-beads-return";
export type Saved = { search: string; open: Record<string, string[]> };

const empty = (): Saved => ({ search: "", open: {} }); // a fresh object each time: callers may not share it
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

function parse(text: string): Saved {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null) return empty();
    const search: unknown = Reflect.get(value, "search");
    const open: unknown = Reflect.get(value, "open");
    return typeof search === "string" && isLists(open) ? { search, open } : empty();
  } catch {
    return empty(); // empty or damaged text
  }
}

export const getReturn = (): Saved => parse(raw());

function save(next: Saved): void {
  const text = JSON.stringify(next);
  memory = text;
  try {
    window.sessionStorage.setItem(RETURN_KEY, text);
  } catch {
    // storage refused: `memory` holds it for this visit
  }
  listeners.forEach((listener) => listener());
}

export function rememberSearch(search: string): void {
  const now = getReturn();
  if (now.search !== search) save({ ...now, search });
}

export function rememberOpen(project: string, ids: readonly string[]): void {
  const now = getReturn();
  save({ ...now, open: { ...now.open, [project]: [...ids] } });
}

export function clearReturn(): void {
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

export function useReturn(): Saved {
  const text = useSyncExternalStore(subscribe, raw);
  return useMemo(() => parse(text), [text]);
}
