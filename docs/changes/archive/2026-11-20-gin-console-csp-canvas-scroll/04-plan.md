# Plan: Graph and Lanes canvas usability

Epic: gin-console-csp
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder. Mockup C: `assets/mockup-c.html`, `assets/c-light.png`, `assets/c-dark.png`.

Evidence of the bug:
- **Scroll:** researcher report 2026-11-20 with probe scripts at `/tmp/probe/p.js` and `/tmp/probe/q.js`. A wheel over the canvas left `window.scrollY` at 0 at 1440×900 and 1920×1080.
- **Root cause:** `overscroll-contain` and `h-[calc(100dvh-14rem)]` at `GraphCanvas.tsx:54`, `LaneGraphCanvas.tsx:67` and `LanesCanvas.tsx:75`.

## Objective
The page is the one vertical scroller of the Graph and Lanes views:
- **Canvases:** each one is as tall as its content, scrolls only sideways, and lets a plain wheel scroll the page. Ctrl/⌘+wheel still zooms.
- **Zoom:** "Fit to view" fits the width.
- **Details panel:**
  - Neither view selects anything while `select` is absent, so the panel opens only on a click or Enter.
  - The panel keeps its own scroll (REQ-UI-078).
- **Lane boxes:** tiers run left to right as in mockup C, with the boxes of a tier stacked. Arrows between lanes run left to right into the left edge of the waiting box, and their chips sit in the tier gap. Loop arrows run in a channel below.

Done when:
- Every scenario of REQ-UI-122 and the modified REQ-UI-077, REQ-UI-106 and REQ-UI-117 has a test that names its REQ. The wheel scenarios are checked in a browser.
- `gin-qa cases check --change gin-console-csp` prints `ok`.
- TC-1 passes on the deployed console.

## Route Rubric
- Choose the weakest model that can do the work.
- Raise the model for broad context or design judgement.
- Raise the effort for intrinsic difficulty: intricate logic, many edge cases, or long chains of steps.

| Kind of work | Model | Effort |
|---|---|---|
| Mechanical edits, documentation, boilerplate | weakest | `low` |
| Bounded implementation with a clear spec | middle | `medium` |
| Cross-module change, security, migration, concurrency | strongest | `high` |

Unclear requirements never raise the model or effort.

## Requirement Analysis
- **Problem statement:**
  - A wheel over the Lanes or Graph canvas does not scroll the page.
  - Two vertical scroll bars show.
  - The details panel opens by default and narrows the canvas.
  - Lane boxes stack top to bottom and leave a wide screen empty on the right.
- **Success criteria:**
  - Everything in the Objective.
  - The frontend checks pass: `test --run`, `typecheck`, `lint`, `build`.
  - The e2e suites stay green.
  - `gin specs lint --change gin-console-csp --against master` prints `ok`, and `trace` lists no missing REQ.
- **Global constraints** (from the spec and the user's decisions):
  - **Canvas boxes** (`GraphCanvas`, `LaneGraphCanvas`, `LanesCanvas`):
    - Classes `isolate overflow-x-auto overflow-y-hidden overscroll-x-contain`, with no `h-[calc(100dvh-14rem)]`, no `overscroll-contain` and no `overflow-auto`.
    - Height: the content height at the scale (plus the horizontal scroll bar), at least `min-h-40`.
  - **Zoom:** `useZoom` fits the width only, as `min(1, clientWidth / width)` clamped to 40%–200%. The wheel handler calls `preventDefault` only with Ctrl/⌘.
  - **Details panel:** `DetailsPanel` and REQ-UI-078 are unchanged.
  - **Selection:**
    - With no `select`, nothing is selected and no details panel shows in the Graph and Lanes views; the canvas spans the width.
    - Escape with a selection goes to no selection.
    - `select=none` keeps its meaning.
    - A `select` in the URL still opens the panel.
  - **Lane graph:**
    - Tiers are columns from left to right, a column's x after the widest box of the earlier tier plus a tier gap of about 140px. The boxes of a tier stack top to bottom with a box gap, in the Lanes view row order. "No lane" comes last in its tier, and in the last tier when unlinked.
    - Box internals are unchanged.
    - **Arrows:**
      - A cross-lane arrow runs from the source card's right middle to the target box's left edge, at the waiting card's middle y, inside the tier gap.
      - Back arrows and loop arrows run in a channel below every box.
      - Arrows inside a box are unchanged.
    - **Chips:** on the arrow in the tier gap, spaced vertically so none overlaps another or an arrow end. An unknown-track chip stays on the waiting box's top edge.
    - **Keys:**
      - Left and Right move within the box, and from the first or last card across tiers along the focused card's arrows (nearest by y), else to the nearest card by y of that tier.
      - Up and Down move to the card nearest by x in the box above or below in the same tier.
      - Enter selects.
    - **Readability:** nothing over a card or header text.
  - **Readability:** see `.planning/knowledge/readable-ui.md` and `lanes-and-merge-gates.md`. Look at the screenshots, not only the detector count.
  - **Rules:** no new dependency. New and changed tests carry their REQ-ID.
- **Non-goals:** the Lanes view layout (rows stay top to bottom), how the details panel scrolls, the Gantt, the List view, virtual scrolling.

## Approach Options
### Option 1: canvas, zoom and selection changes in place; a column layout inside `laneGraph.ts`
- **Summary:**
  - Change the three canvas boxes, `useZoom` and the selection fallback in `GraphView`/`LanesView`.
  - Re-lay `laneGraph.ts` to columns, keeping its exported types so `LaneGraphCanvas` changes little.
- **Pros:** the smallest change set, the same public interfaces, and the existing tests are rewritten in place.
- **Cons:** `laneGraph.ts` geometry and its tests change substantially.

### Option 2: a second layout mode behind a switch
- **Summary:** keep top-to-bottom as an option next to left-to-right.
- **Cons:** the user asked for left to right only (YAGNI), and it would double the tests.

### Recommended Approach
- **Selected option:** Option 1.

## Scope
- **In scope:** the Objective and the Global constraints.
- **Out of scope:** the non-goals.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (canvas scroll, zoom fit and no default selection), Track 2 (lane graph columns) and Track 3 (QA cases) run together; Track 2 touches LaneGraphCanvas.tsx only for arrow and chip rendering and merges after Track 1, taking Track 1's scroll-box line; Track 4 (automated tests for the cases) needs Tracks 1-3; Track 5 checks the merged branch on the deployed console.
```

## Tasks

### Track 1: One vertical scroller, width fit and no default selection
- **Dependencies**: none
- **Requirements**: REQ-UI-122, REQ-UI-077, REQ-UI-106
- **Files**:
  - Modify `frontend/src/features/beads/GraphCanvas.tsx:54` (scroll box classes and height)
  - Modify `frontend/src/features/beads/LaneGraphCanvas.tsx:67` (scroll box classes and height only)
  - Modify `frontend/src/features/beads/LanesCanvas.tsx:75` (scroll box classes and height)
  - Modify `frontend/src/features/beads/useZoom.ts:7-20` (`fitScale` becomes `fitWidth(width, boxW)`, fitting the width)
  - Modify `frontend/src/features/beads/GraphView.tsx:45-48,73`: `selected` falls back to `""` instead of the scope; Escape with a selection goes to `"none"`
  - Modify `frontend/src/features/beads/LanesView.tsx:49,88` (the same)
  - Test: modify `frontend/src/features/beads/{GraphCanvas,LaneGraphCanvas,LanesCanvas,GraphView,LanesView,BeadsPage}.test.tsx`; create `frontend/src/features/beads/useZoom.test.ts` if none exists
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded class, height and fallback changes in known places with exact scenarios. The wheel behaviour needs a real-browser check.
- **Acceptance criteria**:
  - Named tests pass for:
    - REQ-UI-122 "Wheel over the Lanes view" and "Wheel over the Graph view" (class and height contract plus the wheel not prevented), and "Sideways";
    - REQ-UI-077 "Fit", "Fit a tall graph" and "Wheel";
    - REQ-UI-106 "No panel on opening an epic", plus the existing REQ-UI-106 scenarios updated where they relied on the scope being selected.
  - A browser check on a temporary console (port 8722, example regenerated into `/tmp/ex-csp1`), with the pointer over the canvas:
    - `page.mouse.wheel(0, 600)` increases `window.scrollY` on the Lanes view and on the Graph view of `ex-e12` (closed=1) at 1440×900 and 1920×1080;
    - the canvas `scrollTop` stays 0;
    - Ctrl+wheel changes the zoom percentage;
    - no details panel shows on opening, and a click opens it.
  - The implementer looks at screenshots at 390 and 1440 in both themes. The bottom navigation stays on top, and nothing is cut without an ellipsis.
  - Full frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
```ts
// useZoom.ts
export const ZOOM = { min: 0.4, max: 2, step: 0.1 } as const;
export const fitWidth = (width: number, boxW: number): number; // min(1, boxW / width) clamped to [ZOOM.min, ZOOM.max]; 1 when width or boxW is 0
export function useZoom(width: number, height: number): { box: RefObject<HTMLDivElement | null>; scale: number; setScale: ...; fit: () => void; ... } // unchanged shape; fit uses fitWidth
// Each canvas scroll box: className "isolate min-h-40 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded border", style height = content height × scale + scrollbar room (inner stage keeps width × scale)
```

Steps:
1. Write the tests: class and height contracts, `fitWidth`, wheel `defaultPrevented` without and with Ctrl, and no default selection in GraphView and LanesView. Run `pnpm -C frontend test --run src/features/beads` (fails).
2. Implement, then run the tests (pass).
3. Build and run the browser check from the acceptance criteria, then look at the screenshots.
4. Run the full frontend checks.
5. Commit: `git commit -m "fix(beads): the page is the one vertical scroller of the graph and lanes views (gin-console-csp)"`

### Track 2: Lane boxes in tiers from left to right
- **Dependencies**: none (merges after Track 1)
- **Requirements**: REQ-UI-117
- **Files**:
  - Modify `frontend/src/features/beads/laneGraph.ts`: tiers as columns, box placement, cross-lane arrows into the left edge, the loop/back channel below, chips in the tier gap, `laneGraphStep` for the new keys rule
  - Modify `frontend/src/features/beads/LaneGraphCanvas.tsx`: arrowheads and chip rendering for left-to-right arrows, if needed; not the scroll box line, which Track 1 owns
  - Test: modify `frontend/src/features/beads/laneGraph.test.ts` (invariants rewritten for columns), `LaneGraphCanvas.test.tsx` and `GraphView.test.tsx` (lane-scope scenarios)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** an intricate pure geometry re-layout: columns, arrow routing in tier gaps and a channel below, chip spacing and a spatial keys rule, with the invariants kept. It is bounded to one module.
- **Acceptance criteria**:
  - Every REQ-UI-117 scenario passes as reworded: "Boxes in tiers", "Tracks left to right", "Gate chips", "Track not drawn", "No lane box with dependencies", "Lanes in a loop", "Scope without lanes" and "Keys between boxes".
  - Invariants hold: no arrow segment inside a card or header-text rectangle, no chip overlapping a chip or an arrow end, chips inside the tier gap.
  - An ad-hoc browser check of the Graph of `ex-e12` (closed=1) on a temporary console (port 8723), looked at against `assets/c-light.png` and `c-dark.png`:
    - widths 1024, 1440 and 1920 in both themes;
    - the readability detector finds nothing.
  - Full frontend checks pass.
- **Estimated complexity**: high

Interfaces: the exported types of `laneGraph.ts` (`LaneGraph`, `LaneBoxLayout`, `LaneGraphCard`, `LaneGraphArrow`, `LaneGraphChip`, `LANE_GRAPH`, `LANE_CHIP`) keep their shape. `LANE_GRAPH` gains `tierGap` as the horizontal gap (about 140) and `boxGap` as the vertical gap between boxes of a tier. `LaneGraphArrow.toBox` still marks arrows that end on a box edge, now the left edge.

Steps:
1. Rewrite the `laneGraph.test.ts` expectations for columns and the new keys. Run them (fail).
2. Re-lay `laneGraph.ts` and adjust `LaneGraphCanvas` rendering, then run the tests (pass).
3. Run the browser check and look at the screenshots. Then run the full frontend checks.
4. Commit: `git commit -m "feat(beads): lane boxes in tiers from left to right (gin-console-csp)"`

### Track 3: QA cases
- **Dependencies**: none
- **Requirements**: REQ-UI-122, REQ-UI-077, REQ-UI-106, REQ-UI-117
- **Files**:
  - Create `e2e` cases for REQ-UI-122 "Wheel over the Lanes view", "Wheel over the Graph view" and "Sideways"; REQ-UI-077 "Fit a tall graph"; REQ-UI-106 "No panel on opening an epic". They go in `qa/cases/ui/` from the next free id.
  - Modify the cases whose REQ text changed, then re-pin:
    - REQ-UI-077 cases ("Fit" now fits the width; "Wheel");
    - REQ-UI-106 cases (no default selection);
    - REQ-UI-117 cases TC-UI-179, 181, 184, 189 and 190 (tiers left to right, arrows into the left edge, keys Arrow Right, the channel below).
  - Re-pin the rest.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** mechanical case writing and updating from written scenarios.
- **Acceptance criteria**: `gin-qa cases check --change gin-console-csp` prints `ok`, and `gin-qa cases check` shows no new finding.
- **Estimated complexity**: low

Steps:
1. Run `gin-qa cases check --change gin-console-csp` and `gin-qa cases plan --change gin-console-csp`. Write, update and re-pin the cases per `qa/guidelines.md` and the gin-qa cases skill: explicit URLs, one action per step, a blank line after Priority, stubbable preconditions.
2. Commit: `git commit -m "test(qa): cases for the canvas scroller, panel and lane tiers (gin-console-csp)"`

### Track 4: Automated tests for the cases
- **Dependencies**: Track 1, Track 2, Track 3
- **Requirements**: REQ-UI-122, REQ-UI-077, REQ-UI-106, REQ-UI-117, REQ-UI-110
- **Files**:
  - Create specs for the new cases under `qa/e2e/ui/`. The wheel specs:
    - put `page.mouse` over the canvas and call `wheel(0, 600)`;
    - assert that `window.scrollY` grows and the canvas `scrollTop` stays 0;
    - assert that Ctrl+wheel changes the zoom.
  - Modify the specs of the changed cases. The lane graph geometry helper in `qa/e2e/support/lanes.ts` changes for columns. Specs that expected the scope selected by default change too.
  - `qa/e2e/ui/readability.spec.ts` must stay green.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** specs in the existing patterns, one per written case, plus updates of existing ones.
- **Acceptance criteria**:
  - `npx playwright test qa/e2e/ui qa/e2e/milestone-ui --trace off --workers 4` passes on the built UI.
  - `gin-qa cases check --change gin-console-csp` prints `ok`.
  - `gin-qa e2e plan` lists none of the change's cases as missing or stale.
- **Estimated complexity**: medium

Steps:
1. Write and update the specs per the gin-qa e2e skill. Build the UI, run the specs and fix them until they pass. Report any product defect instead of changing product code.
2. Commit: `git commit -m "test(e2e): canvas scroller, no default panel and lane tiers (gin-console-csp)"`

### Track 5: Check on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3, Track 4
- **Requirements**: REQ-UI-122, REQ-UI-077, REQ-UI-106, REQ-UI-117, REQ-UI-110
- **Files**:
  - Modify `docs/changes/gin-console-csp-canvas-scroll/05-tests.md` (TC-1 result)
  - Create `qa/evidence/<date>-csp-tc1/` (gitignored, kept on disk)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** run the written check and record it.
- **Acceptance criteria**: TC-1 is recorded as passed, by claude, with Playwright on the deployed build. The record covers:
  - the wheel results at 1440 and 1920;
  - no panel on opening;
  - the lane tiers left to right, matching mockup C;
  - 0 readability findings;
  - screenshots looked at.
- **Estimated complexity**: low

Steps:
1. Regenerate the example project and deploy the merged branch:
   ```
   python3 scripts/make_example_project.py
   pnpm -C frontend build && uv --directory backend sync && systemctl --user restart gin-console
   ```
   `/api/projects` must return 200.
2. Run the wheel probe on the Lanes and Graph views of `ex-e12` at 1440×900 and 1920×1080. Then run `node qa/e2e/readability-live.js --base http://127.0.0.1:8700 --project example --out qa/evidence/<date>-csp-tc1/live`; it must report 0 findings.
3. Take and look at the screenshots: the Graph of `ex-e12` at 390 and 1440 in both themes, and the Lanes view at 1440. Record TC-1 and commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-csp)"`

## Integration
- **Branch**: `feat/canvas-scroll`
- **Merge strategy**: parallel-then-merge.
  - Tracks 1, 2 and 3 run in worktrees on `feat/canvas-scroll-t<N>`.
  - Merge order: 1, 3, then 2, which merges `feat/canvas-scroll` first and keeps Track 1's scroll-box line in `LaneGraphCanvas.tsx`.
  - Track 4 runs after Tracks 1–3, and Track 5 runs on the merged branch.
- **Later:** gin-console-atl (`feat/epic-page`) rebases after this ships, and its MODIFIED REQ-UI-077 and REQ-UI-106 blocks are re-based.

## Validation
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass
- [ ] `npx playwright test --trace off` passes
- [ ] `gin specs lint --change gin-console-csp --against master` prints `ok`, and `trace` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-csp` prints `ok`
- [ ] TC-1 passes on the deployed console, with screenshots looked at

## Notes
- Track beads close after tests and review pass. Only the epic waits for the human-confirmed merge at ship.
- The user may override `Model:` and `Effort:` before approval.
