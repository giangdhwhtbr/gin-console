import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { HintContext, hintId, type HintRegistry } from "./ui/hintContext";
import { HintTooltip } from "./HintTooltip";
import { useHintTarget } from "./useHintTarget";

/**
 * REQ-UI-132: holds the one tooltip and the one description per distinct text for every `Hint` below it, so that
 * thousands of marks cost one set of listeners and a handful of elements.
 */
export function HintProvider({ children }: { children: ReactNode }) {
  const counts = useRef(new Map<string, number>());
  const [texts, setTexts] = useState<readonly string[]>([]);
  const shown = useHintTarget();
  const register = useCallback((text: string) => {
    counts.current.set(text, (counts.current.get(text) ?? 0) + 1);
    if (counts.current.get(text) === 1) setTexts((all) => [...all, text]);
    return () => {
      const left = (counts.current.get(text) ?? 1) - 1;
      if (left > 0) {
        counts.current.set(text, left);
        return;
      }
      counts.current.delete(text);
      setTexts((all) => all.filter((t) => t !== text));
    };
  }, []);
  const registry = useMemo<HintRegistry>(() => ({ register }), [register]);
  return (
    <HintContext.Provider value={registry}>
      {children}
      <div hidden>
        {texts.map((text) => (
          <span key={text} id={hintId(text)}>
            {text}
          </span>
        ))}
      </div>
      {shown !== null && <HintTooltip shown={shown} />}
    </HintContext.Provider>
  );
}
