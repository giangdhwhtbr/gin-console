import { useEffect, useState } from "react";

type Location = { pathname: string; search: string };

const current = (): Location => ({
  pathname: window.location.pathname,
  search: window.location.search,
});

const STORE = "gin-console-scroll";
const CAP = 50;
/** How long the bead the user came back from stays marked (REQ-UI-127). */
const MARK_MS = 2000;

type Place = { y: number; opened: string | null };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const isPlace = (value: unknown): value is Place =>
  isRecord(value) && typeof value.y === "number" && (value.opened === null || typeof value.opened === "string");

/** The saved places by entry key; storage that is refused or holds something else reads as empty. */
function readPlaces(): Record<string, Place> {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(STORE) ?? "{}");
    if (!isRecord(parsed)) return {};
    const places: Record<string, Place> = {};
    for (const [key, value] of Object.entries(parsed)) if (isPlace(value)) places[key] = value;
    return places;
  } catch {
    return {};
  }
}

function savePlace(key: string, place: Place): void {
  const places = readPlaces();
  delete places[key]; // the newest goes last
  places[key] = place;
  const keys = Object.keys(places);
  for (const old of keys.slice(0, Math.max(0, keys.length - CAP))) delete places[old];
  try {
    window.sessionStorage.setItem(STORE, JSON.stringify(places));
  } catch {
    // refused: the page then starts at the top when the user comes back
  }
}

let counter = 0;
const newKey = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

const keyOf = (state: unknown): string | null => (isRecord(state) && typeof state.key === "string" ? state.key : null);

/** The key of the current history entry; an entry gets one on first use, keeping its other state. */
function ensureKey(): string {
  const existing = keyOf(window.history.state);
  if (existing !== null) return existing;
  const key = newKey();
  const rest = isRecord(window.history.state) ? window.history.state : {};
  window.history.replaceState({ ...rest, key }, "");
  return key;
}

const BEAD_PATH = /^\/beads\/[^/?#]+\/([^/?#]+)/;

function openedBy(to: string): string | null {
  const match = BEAD_PATH.exec(to);
  if (match === null) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/** The entry the user reached by the browser's Back or Forward, until its page has been restored. */
let arrival: string | null = null;
let synthetic = false;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (!synthetic) arrival = keyOf(window.history.state);
  });
}

export function navigate(to: string, options?: { replace?: boolean }): void {
  const key = ensureKey();
  if (options?.replace) {
    window.history.replaceState(window.history.state, "", to);
  } else {
    savePlace(key, { y: window.scrollY, opened: openedBy(to) });
    window.history.pushState({ key: newKey() }, "", to);
    arrival = null;
    window.scrollTo(0, 0);
  }
  synthetic = true;
  try {
    window.dispatchEvent(new PopStateEvent("popstate"));
  } finally {
    synthetic = false;
  }
}

/**
 * REQ-UI-127: after the browser's Back or Forward, once the page shows its data, scroll to where the
 * user left it and mark the bead they opened. A page reached by a link or an address does nothing.
 */
export function useRestoreOnBack(ready: boolean): void {
  const [arrived, setArrived] = useState(0);
  useEffect(() => {
    const onPop = () => setArrived((n) => n + 1);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (!ready || arrival === null) return;
    const key = arrival;
    const frame = window.requestAnimationFrame(() => {
      if (arrival !== key) return;
      arrival = null; // once per arrival
      const place = readPlaces()[key];
      if (place === undefined) return;
      window.scrollTo(0, place.y);
      if (place.opened === null) return;
      const target = document.querySelector<HTMLElement>(`[data-id="${CSS.escape(place.opened)}"]`);
      if (target === null) return;
      target.focus({ preventScroll: true });
      target.setAttribute("data-last-opened", "");
      window.setTimeout(() => target.removeAttribute("data-last-opened"), MARK_MS);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [ready, arrived]);
}

export function useLocation(): Location {
  const [location, setLocation] = useState(current);
  useEffect(() => {
    const update = () =>
      setLocation((prev) => {
        const now = current();
        return prev.pathname === now.pathname && prev.search === now.search ? prev : now;
      });
    window.addEventListener("popstate", update);
    update(); // a child may have navigated in its own mount effect, before this listener existed
    return () => window.removeEventListener("popstate", update);
  }, []);
  return location;
}
