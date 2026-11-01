import { useEffect, type RefObject } from "react";

const THRESHOLD = 4;

/** REQ-MILESTONE-UI-012: drag the scroller sideways with the mouse; the click that ends a drag opens nothing.
 *  Touch and trackpads scroll natively. */
export function usePan(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    let start: { x: number; left: number } | null = null;
    let dragged = false;
    const down = (event: PointerEvent) => {
      dragged = false;
      if (event.pointerType !== "mouse" || event.button !== 0 || el.scrollWidth <= el.clientWidth) return;
      start = { x: event.clientX, left: el.scrollLeft };
    };
    const move = (event: PointerEvent) => {
      if (start === null) return;
      const dx = event.clientX - start.x;
      if (!dragged && Math.abs(dx) <= THRESHOLD) return;
      if (!dragged) {
        dragged = true;
        try {
          el.setPointerCapture?.(event.pointerId);
        } catch {
          // the pointer is no longer active; panning works without capture
        }
        el.dataset.panning = "";
      }
      el.scrollLeft = start.left - dx;
    };
    const up = () => {
      start = null;
      delete el.dataset.panning;
    };
    const noDrag = (event: DragEvent) => event.preventDefault(); // links would start a native drag instead
    const click = (event: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      event.preventDefault();
      event.stopPropagation();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("dragstart", noDrag);
    el.addEventListener("click", click, true);
    return () => {
      el.removeEventListener("dragstart", noDrag);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
    };
  }, [ref]);
}
