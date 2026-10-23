import { useSyncExternalStore } from "react";

export const DISCUSSION_KEY = "gin-console-discussion";

const listeners = new Set<() => void>();
let choice: boolean | null = null; // the choice made in this visit; wins over storage, which may refuse writes

function read(): boolean {
  if (choice !== null) return choice;
  try {
    return window.localStorage.getItem(DISCUSSION_KEY) === "hidden";
  } catch {
    return false; // storage refused: shown by default
  }
}

export function setDiscussionHidden(hidden: boolean): void {
  choice = hidden;
  try {
    if (hidden) window.localStorage.setItem(DISCUSSION_KEY, "hidden");
    else window.localStorage.removeItem(DISCUSSION_KEY);
  } catch {
    // storage refused: `choice` holds it for this visit
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
