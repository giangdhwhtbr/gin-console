import { useEffect, useRef, useState, type ReactNode } from "react";

const FADE = "pointer-events-none absolute inset-y-0 w-8 from-background to-transparent";

/** Wraps a tab list and fades its edge on each side that has hidden tabs; the fades are overlays, so nothing shifts. */
export function TabStrip({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState({ left: false, right: false });

  useEffect(() => {
    const list = box.current?.querySelector<HTMLElement>('[role="tablist"]');
    if (!list) return;
    const update = () => {
      const left = list.scrollLeft > 1;
      const right = list.scrollLeft + list.clientWidth < list.scrollWidth - 1;
      setHidden((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };
    update();
    list.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    const observeTabs = () => {
      resize?.disconnect();
      resize?.observe(list);
      for (const tab of Array.from(list.children)) resize?.observe(tab);
    };
    observeTabs();
    const mutation =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() => {
            observeTabs();
            update();
          });
    mutation?.observe(list, { childList: true });
    return () => {
      resize?.disconnect();
      mutation?.disconnect();
      list.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={box} className="relative">
      {children}
      {hidden.left && <span aria-hidden data-testid="tabs-fade-left" className={`${FADE} left-0 bg-gradient-to-r`} />}
      {hidden.right && <span aria-hidden data-testid="tabs-fade-right" className={`${FADE} right-0 bg-gradient-to-l`} />}
    </div>
  );
}
