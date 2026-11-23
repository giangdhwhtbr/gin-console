import { useEffect, useRef } from "react";
import type { CardChoice } from "./BeadCard";
import type { BeadFilters } from "./filters";
import { useChoose } from "./useChoose";

/** REQ-UI-147, REQ-UI-148: the click rule, the one tab stop and the closing of the Board and Focus views; `drawn` lists the drawn cards in page order. */
export function useCardChoice({
  project,
  filters,
  drawn,
  onChange,
}: {
  project: string;
  filters: BeadFilters;
  drawn: readonly string[];
  onChange: (next: BeadFilters) => void;
}): { choice: CardChoice; close: () => void } {
  const selected = filters.select === "none" ? "" : filters.select;
  const choose = useChoose({ project, selected, select: (id) => onChange({ ...filters, select: id }) });
  // closing returns focus to the card that was selected, or to the first card when it is not drawn
  const closed = useRef<string | null>(null);
  useEffect(() => {
    if (selected !== "" || closed.current === null) return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-card]"));
    (cards.find((card) => card.dataset.id === closed.current) ?? cards[0])?.focus();
    closed.current = null;
  }, [selected]);
  const close = () => {
    closed.current = selected;
    onChange({ ...filters, select: "" });
  };
  const tabStop = drawn.includes(selected) ? selected : (drawn[0] ?? "");
  return { choice: { selected, tabStop, choose, onEscape: close }, close };
}
