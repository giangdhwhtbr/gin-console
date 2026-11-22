import { useEffect, useState } from "react";

export type HintShown = { readonly text: string; readonly target: Element };

const HOVER_DELAY_MS = 300;

const hinted = (node: EventTarget | null): Element | null => (node instanceof Element ? node.closest("[data-hint]") : null);

/** The hinted element the pointer rests on or the focus is in, as REQ-UI-132 asks; one listener set for the whole page. */
export function useHintTarget(): HintShown | null {
  const [shown, setShown] = useState<HintShown | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    const hide = () => {
      window.clearTimeout(timer);
      setShown(null);
    };
    const show = (target: Element) => {
      window.clearTimeout(timer);
      if (!target.isConnected) return; // a refresh or a filter removed the mark within the delay
      const text = target.getAttribute("data-hint");
      if (text !== null) setShown({ text, target });
    };
    const over = (event: PointerEvent) => {
      const target = hinted(event.target);
      if (target === null) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => show(target), HOVER_DELAY_MS);
    };
    const out = (event: PointerEvent) => {
      const target = hinted(event.target);
      if (target !== null && !target.contains(event.relatedTarget instanceof Node ? event.relatedTarget : null)) hide();
    };
    const focusIn = (event: FocusEvent) => {
      const target = hinted(event.target);
      if (target !== null) show(target);
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("focusin", focusIn);
    document.addEventListener("focusout", hide);
    document.addEventListener("keydown", keyDown);
    document.addEventListener("pointerdown", hide);
    document.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("focusin", focusIn);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("keydown", keyDown);
      document.removeEventListener("pointerdown", hide);
      document.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);
  return shown;
}
