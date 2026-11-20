import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const ZOOM = { min: 0.4, max: 2, step: 0.1 } as const;
const clamp = (scale: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, Math.round(scale * 100) / 100));

/** The scale that shows the whole width of the graph in the canvas, never above 100%, floored to a whole percent so it fits. */
export const fitWidth = (width: number, boxW: number) => (width === 0 || boxW === 0 ? 1 : clamp(Math.floor(Math.min(1, boxW / width) * 100 + 1e-6) / 100));

/** The zoom of a canvas: fitted once when it opens, Ctrl/Cmd and the wheel zoom the scroll box in `box`. */
export function useZoom(width: number) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const fit = () => {
    const el = box.current;
    if (el !== null) setScale(fitWidth(width, el.clientWidth));
  };
  // fitted once when the canvas opens; a refresh keeps the user's zoom
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(fit, []);
  useEffect(() => {
    const el = box.current;
    if (el === null) return;
    const wheel = (event: WheelEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || event.deltaY === 0) return; // a plain wheel scrolls the page
      event.preventDefault();
      const delta = Math.abs(event.deltaY) < 10 ? -event.deltaY * 0.01 : (event.deltaY < 0 ? ZOOM.step : -ZOOM.step);
      setScale((s) => clamp(s + delta));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  return {
    box,
    scale,
    fit,
    zoomIn: () => setScale((s) => clamp(s + ZOOM.step)),
    zoomOut: () => setScale((s) => clamp(s - ZOOM.step)),
  };
}
