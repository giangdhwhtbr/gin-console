import { useEffect } from "react";

const typing = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;

const cards = () => Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-card] a"));

function move(step: 1 | -1) {
  const list = cards();
  if (list.length === 0) return;
  const at = list.findIndex((link) => link === document.activeElement);
  const next = at === -1 ? (step === 1 ? 0 : list.length - 1) : (at + step + list.length) % list.length;
  list.at(next)?.focus();
}

/** `/` search, `Esc` leave search, arrows between cards; Enter opens the focused card link natively. */
export function useCardKeys(enabled: boolean, clearSearch: () => void): void {
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
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled, clearSearch]);
}
