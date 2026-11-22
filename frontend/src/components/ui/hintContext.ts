import { createContext } from "react";

/** What a `Hint` needs from the one `HintProvider`: a way to have its text described in the page. */
export type HintRegistry = {
  /** Make sure `text` is described by an element with the id of `hintId(text)`; returns the undo. */
  readonly register: (text: string) => () => void;
};

export const HintContext = createContext<HintRegistry | null>(null);

/** The id of the description of a text: the same text always gives the same id (FNV-1a). */
export function hintId(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return `hint-${(hash >>> 0).toString(36)}`;
}
