# Testing the milestone Gantt in jsdom

## Context
The Gantt (`frontend/src/features/milestones/GanttChart.tsx`, `usePan.ts`) sizes its day columns from the scroller width and pans with pointer events. vitest runs in jsdom, which has no layout: `clientWidth` and `scrollWidth` are 0, and `ResizeObserver`, `Element.scrollTo` and `setPointerCapture` are missing.

## Decision/Solution
- Keep layout math pure in `gantt.ts` (`axisOf`, `fitDayWidth`, `openingDay`, `stepDay`, `dependencyArrows`, `chainOf`) and test it there with plain numbers.
- `GanttChart` falls back to a 960 px width (label 300, plot 660) when the measured width is 0, reads `ResizeObserver` only when it exists, and sets `scrollLeft` directly when `scrollTo` is missing; tests stub `clientWidth`/`scrollWidth` on `[data-scroller]` when they need panning.
- `usePan` calls `setPointerCapture?.()` inside `try/catch`: the call is optional and throws `InvalidStateError` for a pointer that is no longer active.
- Tests read state through DOM hooks (`[data-range]`, `[data-epic]`, `[data-child]`, `path[data-from][data-to]` with `data-late`/`data-state`) instead of pixel positions; focus changes need `act(() => el.focus())`.
- eslint-plugin-react-hooks 7 flags `setState` inside `useEffect` (`set-state-in-effect`) but allows it in `useLayoutEffect`; the opening scroll lives in a layout effect.

## Consequences
Real dragging, swiping, trackpad scrolling and the look at each zoom cannot be proven in vitest; they stay manual cases (TC-1, TC-2) checked on the Tailscale build.

## References
- Epic gin-console-38i (tracks .1, .2, .3); `docs/changes/archive/2026-11-01-gin-console-38i-gantt-zoom/`
- Review finding `minor-usepan-setpointercapture-unguarded` (gin-console-38i.2), fixed in 5e07ced

## Scope
gin-console frontend, `features/milestones` Gantt and any future chart that measures layout or uses pointer events.
