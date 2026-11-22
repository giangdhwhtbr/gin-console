import { cloneElement, useContext, useLayoutEffect, type ReactElement } from "react";
import { HintContext, hintId } from "./hintContext";

type HintTarget = { "aria-describedby"?: string; "data-hint"?: string };

/**
 * REQ-UI-132: a one-sentence tooltip on hover and focus. It only marks its child with the text (`data-hint`) and
 * points `aria-describedby` at the one description of that text; the single `HintProvider` shows the tooltip.
 * Without a provider the child is left as it is.
 */
export function Hint({ text, children }: { text: string; children: ReactElement<HintTarget> }) {
  const registry = useContext(HintContext);
  useLayoutEffect(() => registry?.register(text), [registry, text]);
  if (registry === null) return children;
  return cloneElement(children, { "aria-describedby": hintId(text), "data-hint": text });
}
