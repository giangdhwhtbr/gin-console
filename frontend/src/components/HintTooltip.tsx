import { useLayoutEffect, useRef } from "react";
import type { HintShown } from "./useHintTarget";

const GAP = 4;
const MARGIN = 8;

/** The one tooltip of the page: below its target, above when there is no room, inside the window. */
export function HintTooltip({ shown }: { shown: HintShown }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const tip = ref.current;
    if (tip === null) return;
    const anchor = shown.target.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = tip;
    const below = anchor.bottom + GAP + height <= window.innerHeight - MARGIN;
    const left = Math.min(Math.max(anchor.left, MARGIN), Math.max(MARGIN, window.innerWidth - width - MARGIN));
    tip.style.top = `${Math.max(MARGIN, below ? anchor.bottom + GAP : anchor.top - GAP - height)}px`;
    tip.style.left = `${left}px`;
  }, [shown]);
  return (
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-50 max-w-72 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
      style={{ top: 0, left: 0 }}
    >
      {shown.text}
    </div>
  );
}
