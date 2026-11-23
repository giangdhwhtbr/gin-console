import { useEffect } from "react";

const typing = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;

const cards = () => Array.from(document.querySelectorAll<HTMLElement>("[data-card]"));

/** Focus the next or previous card; false (and nothing done) when there is no card. */
function move(step: 1 | -1): boolean {
  const list = cards();
  const at = list.findIndex((card) => card.contains(document.activeElement));
  const next = at === -1 ? (step === 1 ? 0 : list.length - 1) : (at + step + list.length) % list.length;
  const card = list.at(next);
  card?.focus();
  return card !== undefined;
}

/** `/` search, `Esc` leave search, arrows between the cards themselves; the card handles Enter (REQ-UI-037, REQ-UI-147). */
export function useCardKeys(enabled: boolean, clearSearch: () => void, arrows = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (event.key === "Escape" && target instanceof HTMLInputElement && target.type === "search") {
        if (target.value !== "") clearSearch();
        else target.blur();
        return;
      }
      if (typing(target)) return;
      if (event.key === "/") {
        event.preventDefault();
        document.getElementById("bead-search")?.focus();
        return;
      }
      if (!arrows || (target instanceof Element && target.closest("aside") !== null)) return; // REQ-UI-078: the arrow keys scroll the details panel
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        if (move(1)) event.preventDefault();
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        if (move(-1)) event.preventDefault();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled, clearSearch, arrows]);
}
