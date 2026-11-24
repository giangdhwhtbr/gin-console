import { useEffect, useState, useSyncExternalStore } from "react";
import { fetchProjectBeads } from "@/features/projects/api";

export const TAB_PROJECT_KEY = "gin-console-project";
export const FAVORITE_KEY = "gin-console-favorite-project";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// What was set in this visit wins over storage, which may refuse writes. `undefined`: nothing set yet.
let tabMemory: string | null | undefined;
let favoriteMemory: string | null | undefined;

function read(store: () => Storage, key: string): string | null {
  try {
    return store().getItem(key);
  } catch {
    return null; // storage refused: nothing is remembered yet
  }
}

function write(store: () => Storage, key: string, value: string | null): void {
  try {
    if (value === null) store().removeItem(key);
    else store().setItem(key, value);
  } catch {
    // storage refused: the memory value holds it for this visit
  }
}

const tabProject = (): string | null => (tabMemory !== undefined ? tabMemory : read(() => window.sessionStorage, TAB_PROJECT_KEY));
const favorite = (): string | null => (favoriteMemory !== undefined ? favoriteMemory : read(() => window.localStorage, FAVORITE_KEY));

export function rememberProject(name: string): void {
  tabMemory = name;
  write(() => window.sessionStorage, TAB_PROJECT_KEY, name);
  notify();
}

export function setFavorite(name: string | null): void {
  favoriteMemory = name;
  write(() => window.localStorage, FAVORITE_KEY, name);
  notify();
}

export const useFavorite = (): string | null => useSyncExternalStore(subscribe, favorite);
export const useTabProject = (): string | null => useSyncExternalStore(subscribe, tabProject);

export function resolveProject(asked: string, names: readonly string[]): string {
  if (names.includes(asked)) return asked;
  for (const candidate of [tabProject(), favorite()]) {
    if (candidate !== null && names.includes(candidate)) return candidate;
  }
  return names[0] ?? "";
}

// "all" is the retired Reports value: it resolves to the current project quietly
export const isUnknownProject = (asked: string, names: readonly string[]): boolean =>
  asked !== "" && asked !== "all" && !names.includes(asked);

function withQuery(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return query === "" ? path : `${path}?${query}`;
}

export function projectHref(path: "/beads" | "/milestones" | "/my-tasks" | "/reports" | "/reports/status", project: string): string {
  return project === "" ? path : withQuery(path, new URLSearchParams({ project }));
}

const KEPT = ["view", "closed", "tab", "days", "q"];

/** The place of another project: a list page or a report section keeps its path and the kept keys (never a milestone of the old project). */
export function switchProject(pathname: string, search: string, name: string): string {
  if (pathname === "/beads" || pathname === "/milestones" || pathname === "/my-tasks" || pathname === "/reports" || pathname.startsWith("/reports/")) {
    const old = new URLSearchParams(search);
    const next = new URLSearchParams({ project: name });
    for (const key of KEPT) {
      const value = old.get(key);
      if (value !== null) next.set(key, value);
    }
    return withQuery(pathname, next);
  }
  if (pathname.startsWith("/beads/")) return projectHref("/beads", name);
  if (pathname.startsWith("/milestones/")) return projectHref("/milestones", name);
  return pathname + search;
}

export type ConfiguredProjects = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; names: string[] };

let loading: Promise<string[]> | null = null;
let version = 0; // bumped by `forgetConfiguredProjects`, so that mounted hooks ask again

function load(): Promise<string[]> {
  loading ??= fetchProjectBeads().then((projects) => projects.filter((project) => project.exists).map((project) => project.name));
  return loading;
}

/** Drops the cached list, so that the next `useConfiguredProjects` asks again (Refresh). */
export function forgetConfiguredProjects(): void {
  loading = null;
  version += 1;
  notify();
}

export function useConfiguredProjects(): ConfiguredProjects {
  const [state, setState] = useState<ConfiguredProjects>({ status: "loading" });
  const asked = useSyncExternalStore(subscribe, () => version);
  useEffect(() => {
    let live = true;
    const request = load();
    request.then(
      (names) => live && setState({ status: "ok", names }),
      (error: unknown) => {
        if (loading === request) loading = null; // a failure is not cached
        if (live) setState({ status: "error", message: error instanceof Error ? error.message : "Could not load projects" });
      },
    );
    return () => {
      live = false;
    };
  }, [asked]);
  return state;
}
