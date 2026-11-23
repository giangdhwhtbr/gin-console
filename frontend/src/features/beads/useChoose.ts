import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import { navigate } from "@/app/route";
import { useWide } from "./useWide";

const enc = encodeURIComponent;

/** The longest time between a click and the `dblclick` that opens its item. */
export const DOUBLE_CLICK_MS = 500;

/** REQ-UI-147: how a row, card or node of the List, Board, Focus, Graph and Lanes views is selected and opened. */
export type Choose = {
  /** A click on the item: from 1024px select it (a click on the selected item keeps it), below open its bead page. */
  click: (id: string) => void;
  /** Open the bead page with a history entry; the push remembers the place for Back (REQ-UI-127). */
  open: (id: string) => void;
  /** `Enter` on the item: from 1024px select it while it is not selected, otherwise open it. */
  enter: (id: string) => void;
  /** `Enter` on the focused item itself, without a modifier; keys from controls inside the item are left alone. */
  onKey: (event: KeyboardEvent<HTMLElement>, id: string) => void;
};

/** `selected` is the URL's `select`; `select` writes it without a history entry. */
export function useChoose({ project, selected, select }: { project: string; selected: string; select: (id: string) => void }): Choose {
  const wide = useWide();
  const open = useCallback((id: string) => navigate(`/beads/${enc(project)}/${enc(id)}`), [project]);
  const last = useRef<{ id: string; at: number } | null>(null);
  useEffect(() => {
    // REQ-UI-147 Double click: the first click may open the panel and move the item, so the second click can land
    // on another element; the double click opens the item the first click chose, wherever the second one landed.
    const onDouble = (event: MouseEvent) => {
      const first = last.current;
      last.current = null;
      if (first === null || Date.now() - first.at > DOUBLE_CLICK_MS) return;
      event.stopPropagation();
      open(first.id);
    };
    document.addEventListener("dblclick", onDouble, true);
    return () => document.removeEventListener("dblclick", onDouble, true);
  }, [open]);
  const enter = (id: string) => {
    if (wide && id !== selected) select(id);
    else open(id);
  };
  return {
    click: (id) => {
      last.current = { id, at: Date.now() };
      if (!wide) open(id);
      else if (id !== selected) select(id);
    },
    open,
    enter,
    onKey: (event, id) => {
      if (event.key !== "Enter" || event.target !== event.currentTarget) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      event.preventDefault();
      enter(id);
    },
  };
}
