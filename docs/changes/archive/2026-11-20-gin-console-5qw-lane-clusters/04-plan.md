# Plan: Lane clusters

Epic: gin-console-5qw
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder. Mockup: `docs/specs/ui/assets/2026-11-20/mockup/index.html`, variant B (`shots/b-light.png`, `shots/b-dark.png`). Diagram: `docs/specs/ui/diagrams/lane-clusters-activity.md`.

## Objective
The Graph view of a scope whose children have lanes draws one coloured box per lane:
- **Boxes:** placed in tiers by the dependencies between lanes, with a dashed neutral "No lane" box last.
- **Cards:** each lane's tracks run left to right inside its box.
- **Arrows:** card to card inside a box, and card to box between lanes.
- **Merge gates:** a Waiting or Merged chip on each arrow through a merge gate, instead of a gate node.
- **Other scopes:** the Graph view is unchanged.

Done when:
- Every scenario of REQ-UI-117, REQ-UI-118 and the modified REQ-UI-116 has a test that names its REQ.
- `gin-qa cases check --change gin-console-5qw` prints `ok`.
- TC-1 passes on the deployed console, with screenshots looked at and matching the mockup.

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
- **Problem statement:** in the Graph of an epic with lanes, tracks are separate nodes with small chips, and a merge gate is a dashed node that looks like a bead. The user found this confusing (2026-11-20).
- **Success criteria:**
  - Everything in the Objective.
  - The frontend checks pass: `pnpm -C frontend test --run`, `typecheck`, `lint`, `build`.
  - The existing e2e suites stay green.
  - `gin specs lint --change gin-console-5qw --against master` prints `ok`, and `gin specs trace --change gin-console-5qw` lists no missing REQ.
- **Global constraints** (from the spec and the user's decisions):
  - **Scope:** only the Graph view of a scope that `hasLanes` accepts. The Lanes view, the lane chips elsewhere and the Graph of other scopes are unchanged.
  - **Boxes:**
    - A box is in the tier after every lane it waits for, directly or through a merge gate. A tier's boxes follow the Lanes view row order. "No lane" comes last in the last tier.
    - Cards run left to right by dependency layer inside the lane, and cards of one layer stack vertically.
    - A box with no drawn card is left out. "Only linked" is not offered.
  - **Arrows:**
    - Card to card inside a box, and card to the top edge of the other lane's box.
    - Through an open gate the arrow is dashed with the chip "Waiting · <lane> #<N>". Through a closed gate the chip reads "Merged · <lane> #<N>".
    - When the gate's track is not drawn, there is no arrow and the chip "Waiting for track <N>" or "Merged track <N>" sits on the top edge of the waiting box.
    - Nothing is drawn over a card or a header's text.
  - **Header:**
    - Line 1: swatch, name in bold, and the state (icon and words, REQ-UI-112).
    - Line 2 (muted): holder, lease and "<closed>/<total> closed", cut with an ellipsis and `title`.
    - "No lane": a dashed neutral box with no swatch and no state.
  - **Colours:**
    - Eight `--lane-1..8` tokens, light `#2a78d6 #eb6834 #1baf7a #eda100 #e87ba4 #008300 #6250d6 #e34948` and dark `#3987e5 #d95926 #199e70 #c98500 #d55181 #008300 #9085e9 #e66767`.
    - The slot is the position of the lane name among the scope's sorted lane names, wrapping after 8, so it is stable under filters.
    - Tint 9% light / 16% dark; border 55% / 60%.
    - Text keeps the text colours at 4.5:1 or more.
  - **Interaction:**
    - Selection, details panel, Escape, opening and the screen-reader list work as in the Graph view.
    - Left and Right move inside a box. Up and Down move to the nearest card of the nearest box one tier up or down.
    - Path highlight works over the card arrows.
  - **Readability:** see `.planning/knowledge/readable-ui.md` and `lanes-and-merge-gates.md`.
    - Scroll boxes with z-indexed layers need `isolate`.
    - Every inline fact item and state word carries `max-w-full`.
    - Look at the screenshots, not only the detector count.
  - **Rules:** no new dependency. New and changed tests carry their REQ-ID.
- **Non-goals:** lane colours elsewhere, collapsing or resizing boxes, pull request state.

## Approach Options
### Option 1: a pure lane-graph layout and its own canvas, with the zoom code shared through a hook
- **Summary:**
  - `laneGraph.ts` computes boxes, cards, arrows and chips as plain numbers.
  - `LaneGraphCanvas.tsx` draws them.
  - The zoom state, fit and Ctrl/⌘-wheel zoom move out of `GraphCanvas` into `useZoom`, with a `ZoomBar` component used by both canvases.
- **Pros:** the layered Graph code (`scopeGraph`, `place`, `step`) stays untouched. The geometry is unit-testable. Zoom stays in one place.
- **Cons:** two canvas components.

### Option 2: teach `GraphCanvas` an optional precomputed layout
- **Summary:** pass boxes and positions into `GraphCanvas` and branch inside it.
- **Pros:** one component.
- **Cons:** `GraphCanvas` is built around `Graph` (`place`, `linkLabels`, `chainOf`, `step`), so many branches would follow. That raises the risk to the existing Graph view and its tests.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** it keeps a single zoom implementation, as the design asks, without branching the layered canvas. This refines the `03-design.md` Architecture bullet "GraphCanvas gains an optional precomputed layout"; the bullet is updated with this plan.

## Scope
- **In scope:** the Objective and the Global constraints.
- **Out of scope:** the non-goals.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (lane-graph layout and colour tokens) and Track 3 (QA cases) share no file and run together; Track 2 (canvas and Graph view wiring) builds on Track 1; Track 4 (automated tests for the cases) needs Tracks 2 and 3; Track 5 checks the merged branch on the deployed console.
```

## Tasks

### Track 1: Lane-graph layout and lane colours
- **Dependencies**: none
- **Requirements**: REQ-UI-117, REQ-UI-118
- **Files**:
  - Create `frontend/src/features/beads/laneGraph.ts` (pure layout, keys, chain and colour slots)
  - Modify `frontend/src/features/beads/lanes.ts`: export the grouping and dependency helpers that `lanesOf` uses internally (track grouping by lane, blockers among drawn cards plus gate edges, the row order) so `laneGraph.ts` reuses them; no behaviour change
  - Modify `frontend/src/index.css`: `--lane-1..8` in `:root` and `.dark`, and `--color-lane-1..8` in the `@theme` block
  - Test: create `frontend/src/features/beads/laneGraph.test.ts` (an `ex-e12`-shaped fixture, reusing `laneFixtures.ts`); `lanes.test.ts` must stay green
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** intricate pure geometry with many edge cases:
  - lane tiers from lane-to-lane edges, with cycles;
  - card columns inside boxes;
  - arrows that must avoid cards and headers;
  - chip spacing;
  - stable colour slots.
  It is bounded to one module with an exact spec.
- **Acceptance criteria**:
  - The geometry and colour scenarios have passing tests named for their REQ: REQ-UI-117 "Boxes in tiers", "Tracks left to right", "Gate chips", "Track not drawn" (layout part) and "Keys between boxes"; REQ-UI-118 "Colours follow the lane name" and "No lane box" (layout part).
  - Further tests show:
    - no arrow segment intersects a card rectangle or a header text rectangle;
    - no two chips intersect;
    - lanes in a cycle share one tier and are listed in `cycle`;
    - a filtered-out lane keeps the slots of the others.
  - Full frontend checks pass.
- **Estimated complexity**: high

Interfaces produced (Track 2 consumes them):
```ts
// laneGraph.ts
export const LANE_GRAPH = { margin: 16, pad: 14, head: 52, cardGap: 32, stackGap: 16, boxGap: 24, tierGap: 88 } as const;
export type LaneBoxLayout = {
  lane: string | null;          // null = "No lane"
  slot: number;                 // 1..8 lane colour, 0 for "No lane"
  tier: number; x: number; y: number; w: number; h: number;
  state: LaneState | null;      // REQ-UI-112, null for "No lane"
  meta: string;                 // line 2: "ann · lease until 21 Nov 16:00 · 1/2 closed" / "1/2 closed"
};
export type LaneGraphCard = { bead: BeadSummary; lane: string | null; x: number; y: number; layer: number; stack: number };
export type LaneGraphArrow = { from: string; to: string; toBox: boolean; gate: BeadSummary | null; dashed: boolean; d: string; chip: { x: number; y: number } | null };
export type LaneGraphChip = { gate: BeadSummary; kind: "waiting" | "merged"; words: string; x: number; y: number; w: number; box: string | null };
export type LaneGraph = { boxes: LaneBoxLayout[]; cards: LaneGraphCard[]; arrows: LaneGraphArrow[]; chips: LaneGraphChip[]; cycle: string[]; width: number; height: number };
export function laneSlots(beads: readonly BeadSummary[], scopeId: string): Map<string, number>;
export function laneGraph(beads: readonly BeadSummary[], scopeId: string, matched: ReadonlySet<string>, now: Date): LaneGraph;
export function laneGraphStep(graph: LaneGraph, id: string, key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown"): string | null;
export function laneGraphChain(graph: LaneGraph, id: string): { nodes: Set<string>; arrows: Set<string> }; // arrow key `${from}>${to}`
export function laneGraphLines(graph: LaneGraph): { key: string; text: string }[]; // screen-reader lines: one per lane, then one per arrow
```

Geometry:
- **Box size:**
  - Cards are 184×64. A card's x is `box.x + pad + layer·(184 + cardGap)`, and its y is `box.y + head + pad + stack·(64 + stackGap)`.
  - `box.w = 2·pad + layers·184 + (layers−1)·cardGap`.
  - `box.h = head + 2·pad + stacks·64 + (stacks−1)·stackGap`.
- **Tiers:** start at `margin`. Each tier's y is the previous tier's bottom plus `tierGap`. Boxes in a tier sit left to right with `boxGap` between them.
- **Arrows inside a box:**
  - Adjacent layers on the same stack row: a straight segment from the right middle of one card to the left middle of the next.
  - Otherwise: an orthogonal route through the gap under the cards.
- **Arrows between lanes:** a cubic curve from the bottom middle of the source card to the top edge of the target box, at the x of the target card's centre. Arrows through an open gate are dashed.
- **Chips:**
  - Height 20, width 120 for "Waiting · be #2" and 152 for "… track N".
  - Placed at t = 0.3 along their curve, then moved along x in 8px steps until no two chips intersect.
- **Unknown track:** the chip sits on the top edge of the waiting box, starting at its left edge plus `pad`.

Steps:
1. Write `laneGraph.test.ts` with the scenarios and invariants above. Run `pnpm -C frontend test --run src/features/beads/laneGraph.test.ts` (fails).
2. Export the needed helpers from `lanes.ts` (keeping `lanes.test.ts` green), implement `laneGraph.ts` and add the tokens. Run the tests (pass).
3. Run the full frontend checks (pass).
4. Commit: `git commit -m "feat(beads): lane graph layout and lane colours (gin-console-5qw)"`

### Track 2: Lane boxes in the Graph view
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-117, REQ-UI-118, REQ-UI-116
- **Files**:
  - Create `frontend/src/features/beads/useZoom.ts` (scale, fit, Ctrl/⌘-wheel), moved out of `GraphCanvas.tsx:16-75`
  - Create `frontend/src/features/beads/ZoomBar.tsx` (the Zoom out/in, scale and "Fit to view" group), moved out of `GraphCanvas.tsx`
  - Modify `frontend/src/features/beads/GraphCanvas.tsx` (use `useZoom` and `ZoomBar`; behaviour unchanged)
  - Create `frontend/src/features/beads/LaneGraphCanvas.tsx`:
    - **Draw order:** an `isolate` scroll box, then the boxes, the SVG arrows, the cards and the chips.
    - **Interaction:** roving focus with `laneGraphStep`, selection highlight with `laneGraphChain`, and an sr-only list from `laneGraphLines`.
  - Create `frontend/src/features/beads/LaneBox.tsx`: one box with its two-line header, ellipsis and `title`; `max-w-full` on the inline items.
  - Modify `frontend/src/features/beads/GraphView.tsx`: in `GraphBody`, when `hasLanes(beads, scopeId)`, render `LaneGraphCanvas` with `laneGraph(...)` and hide "Only linked"; otherwise as today.
  - Test:
    - Create `frontend/src/features/beads/{LaneGraphCanvas,LaneBox}.test.tsx`.
    - Modify `frontend/src/features/beads/GraphView.test.tsx`: the lanes scope shows boxes and no gate node; a scope without lanes shows layers and "Only linked".
    - Modify `frontend/src/features/beads/BeadsPage.test.tsx`: REQ-UI-116 "Merge gate chip in lane boxes" through the real `BeadsView` data path, and "Merge gate node" at project scope with `ex-g3`.
    - `GraphCanvas.test.tsx` must stay green.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:**
  - It wires a computed layout into a canvas, following `LanesCanvas` and `GraphCanvas`, with exact scenarios.
  - The zoom move is mechanical.
- **Acceptance criteria**:
  - The view scenarios have passing tests named for their REQ:
    - REQ-UI-117 "Boxes in tiers", "Gate chips", "Track not drawn", "Scope without lanes", "Keys between boxes";
    - REQ-UI-118 "Header" and "No lane box";
    - REQ-UI-116 "Merge gate node" and "Merge gate chip in lane boxes".
  - The existing Graph view, GraphCanvas and Lanes tests stay green.
  - An ad-hoc Playwright run of `qa/e2e/support/readability-inpage.js` on the built UI finds nothing on `/beads?project=example&milestone=all&view=graph&scope=ex-e12` with "Show closed" on:
    - setup: a temporary console on port 8720, with the example project regenerated into `/tmp/ex-5qw`;
    - range: 390, 1024, 1440 and 1920px in both themes.
  - The implementer looks at the 1440 light and 390 dark screenshots. The bottom navigation must stay on top at 390, and no text may be cut without an ellipsis.
  - Full frontend checks pass.
- **Estimated complexity**: medium

Steps:
1. Move zoom into `useZoom` and `ZoomBar`, and run `pnpm -C frontend test --run src/features/beads/GraphCanvas.test.tsx` (pass, unchanged).
2. Write the new and changed tests. Run `pnpm -C frontend test --run src/features/beads` (fails).
3. Implement `LaneBox`, `LaneGraphCanvas` and the `GraphView` branch, then run the tests (pass).
4. Build, run the browser check above, look at the screenshots, and iterate until clean. Then run the full frontend checks (pass).
5. Commit: `git commit -m "feat(beads): lane boxes in the graph view (gin-console-5qw)"`

### Track 3: QA cases
- **Dependencies**: none
- **Requirements**: REQ-UI-117, REQ-UI-118, REQ-UI-116
- **Files**:
  - Create `e2e` cases for each scenario of REQ-UI-117 and REQ-UI-118, from the next free TC-UI id, in `qa/cases/ui/`, with explicit URLs (`/beads?project=example&milestone=all&view=graph&scope=ex-e12`, "Show closed" on) and one action per step
  - Create a case for REQ-UI-116 "Merge gate chip in lane boxes"
  - Modify the cases pinned to REQ-UI-116:
    - TC-UI-176 "Merge gate node" moves to the project scope with `ex-g3` and "Show closed" on;
    - re-pin the rest.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** mechanical case writing from written scenarios.
- **Acceptance criteria**: `gin-qa cases check --change gin-console-5qw` prints `ok`, and `gin-qa cases check` shows no new finding.
- **Estimated complexity**: low

Steps:
1. `gin-qa cases plan --change gin-console-5qw`, then write, update and re-pin the cases per `qa/guidelines.md` and the gin-qa cases skill.
2. Commit: `git commit -m "test(qa): cases for lane boxes in the graph (gin-console-5qw)"`

### Track 4: Automated tests for the cases
- **Dependencies**: Track 2, Track 3
- **Requirements**: REQ-UI-117, REQ-UI-118, REQ-UI-116, REQ-UI-110
- **Files**:
  - Create a Playwright spec per new `e2e` case under `qa/e2e/ui/`, stubbed through `qa/e2e/support/{api,lanes}.ts`. Geometry checks assert that no arrow or chip intersects a card or a header, through a helper in `qa/e2e/support/lanes.ts`.
  - Modify `qa/e2e/ui/tc-ui-176.spec.ts` (project scope, `ex-g3`) and the specs of the re-pinned cases where their text changed
  - Modify `qa/e2e/ui/readability.spec.ts`: add the Graph of `ex-e12` with closed beads to the 'beads lanes' group
  - Modify `qa/e2e/readability-live.js`: in `pagesOf`, add `beads graph lanes <epic>` at `/beads?project=<p>&milestone=all&view=graph&scope=<epic>&closed=1` for the first epic with lanes
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** specs in the existing patterns, one per written case.
- **Acceptance criteria**:
  - `npx playwright test qa/e2e/ui qa/e2e/milestone-ui --trace off` passes on the built UI (:8701), with the new specs and the readability spec.
  - The live script lists the new page.
  - `gin-qa cases check` prints `ok`.
- **Estimated complexity**: medium

Steps:
1. `gin-qa e2e plan`; write the specs per the gin-qa e2e skill; build the UI; run them and fix the specs until they pass. Report any product defect instead of changing product code.
2. Commit: `git commit -m "test(e2e): lane boxes in the graph (gin-console-5qw)"`

### Track 5: Check on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3, Track 4
- **Requirements**: REQ-UI-110, REQ-UI-117, REQ-UI-118
- **Files**:
  - Modify `docs/changes/gin-console-5qw-lane-clusters/05-tests.md` (TC-1 result)
  - Create `qa/evidence/<date>-5qw-tc1/` (gitignored, kept on disk)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** run the written check and record it.
- **Acceptance criteria**: TC-1 is recorded as passed, by claude, with Playwright on the deployed build of `<commit>`, with 0 findings and with screenshots looked at. The screenshots are the Graph of `ex-e12` at 390 and 1440px in light and dark, compared to `docs/specs/ui/assets/2026-11-20/shots/b-*.png`.
- **Estimated complexity**: low

Steps:
1. Regenerate the example project and deploy the merged branch:
   ```
   python3 scripts/make_example_project.py
   pnpm -C frontend build && uv --directory backend sync && systemctl --user restart gin-console
   ```
   `/api/projects` must return 200.
2. Run `node qa/e2e/readability-live.js --base http://127.0.0.1:8700 --project example --out qa/evidence/<date>-5qw-tc1/live`; it must report no finding.
3. Take and look at every screenshot. Check the boxes, colours, headers, chips, that no gate node is drawn, and that the bottom navigation is on top at 390. Record TC-1 and commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-5qw)"`

## Integration
- **Branch**: `feat/lane-clusters`
- **Merge strategy**: parallel-then-merge.
  - Tracks 1 and 3 run in worktrees on `feat/lane-clusters-t<N>`.
  - Track 2 starts after Track 1 merges, and Track 4 after Tracks 2 and 3.
  - Merge order: 1, 3, 2, 4.
  - Track 5 runs on the merged branch.
- `feat/epic-page` (gin-console-atl) is branched from `feat/lane-clusters` and ships after it.

## Validation
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass
- [ ] `npx playwright test --trace off` passes, readability spec included
- [ ] `gin specs lint --change gin-console-5qw --against master` prints `ok`, and `gin specs trace --change gin-console-5qw` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-5qw` prints `ok`
- [ ] TC-1 passes on the deployed console, with screenshots looked at

## Notes
- Track beads close after tests and review pass. Only the epic waits for the human-confirmed merge at ship.
- The user may override `Model:` and `Effort:` before approval.
