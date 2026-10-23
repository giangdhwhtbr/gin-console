import { useSyncExternalStore } from "react";

export const DISCUSSION_KEY = "gin-console-discussion";

const listeners = new Set<() => void>();
let fallback = false; // used only when the browser refuses to store the choice

function read(): boolean {
  try {
    return window.localStorage.getItem(DISCUSSION_KEY) === "hidden";
  } catch {
    return fallback; // storage refused: the choice lasts for this visit only
  }
}

export function setDiscussionHidden(hidden: boolean): void {
  fallback = hidden;
  try {
    if (hidden) window.localStorage.setItem(DISCUSSION_KEY, "hidden");
    else window.localStorage.removeItem(DISCUSSION_KEY);
  } catch {
    // storage refused: `fallback` holds the choice for this visit
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useDiscussionHidden(): [boolean, () => void] {
  const hidden = useSyncExternalStore(subscribe, read);
  return [hidden, () => setDiscussionHidden(!hidden)];
}
