# Lanes view and merge gates from gin-workflow team mode

**Context**
Epic gin-console-9ix (2026-11-20) shows gin-workflow's team-mode lanes (gin-workflow-ifbt): a lane is one member's tracks of an epic in one repository, on one branch and one pull request. No configured project runs team mode yet, so the feature was built and checked on the example project's epic `ex-e12`. The console reads only the Beads export: no `gin team` output, no pull request state.

**Decision/Solution**
- **Fields** (`backend/src/gin_console/beads/lanes.py`, regexes copied from gin-workflow `team_pending.py`/`team_beads.py`):
  - `lane`: the `Lane:` description line, else the `lane:` label; must match `^[a-z0-9][a-z0-9-]*$`.
  - `track`: `{plan, number}` from `Plan: <path>, Track <N>`, else the `track:<N>` label.
  - `claim`: `{holder, expires_at}` from `metadata.claim`, given as an object or a JSON string, with the stamp `YYYY-MM-DDTHH:MM:SSZ`.
  - `waits_for`: `{plan, number, track_id, lane}` from a title `external: <path>#<N>`.
- **Merge gates:** "merge gate" is the console's name for gin-workflow's placeholder bead; only its title is fixed upstream.
  - **Resolution (server):** `gate_ref` looks among the children of the gate's parent, or, for a gate without a parent, of the parent of the first bead it blocks. It takes the single exact plan and number match, else the only child with that number, else null. The server does this because the bead page has no bead list.
  - **Relations:** dependencies and dependents use `GateRelation`, and `ChildRelation` carries `waits_for`. Bugs keep the plain `Relation`, because `test_beads_002_bugs_over_http` compares relation dicts exactly.
- **A merge gate is not work:**
  - **Backend:** it is never `ready` but still blocks; it is left out of the project counts (`projects/source.py`) and of report selection and the team scope (`reports/source.py` `read_beads`).
  - **Frontend:** `withoutMergeGates` drops it from List, Board, Focus, My Tasks, Gantt child rows and every child count.
  - **Where it still shows:** the Graph (a dashed `GitMerge` node), the Lanes markers, its bead page and the Dependencies words.
  - **Graph wiring:** the Graph's `matched` must be built from the milestone-free list that still holds the gates (`BeadsView.tsx` `withGates`). Bug gin-console-9ix.9 hid every gate node, and a GraphView unit test that passed in a hand-made `matched` set hid it.
- **Lanes layout** (`frontend/src/features/beads/lanes.ts`, pure and unit-tested):
  - `LANE = {cardW 184, cardH 64, rowH 144, gapX 48, gapY 32, padX 16, padY 32}`.
  - Columns are a longest path over blockers, gate targets and the previous card in each row.
  - Arrows are orthogonal and run only through column and row gaps.
  - Markers (Waiting/Merged) sit on the gate arrow's row-gap segment; the opaque chips may cover another arrow's straight segment.
  - The lane state is the first of All tracks closed, Running, Waiting for <lanes>, Blocked, Not started, Idle. The tab is decided from the loaded children.
- **Canvas** (`LanesCanvas.tsx`):
  - It has a sticky header column that is 168px under 1024px and 240px from 1024px.
  - It needs `isolate`; see [readable-ui](readable-ui.md).
- **One vertical scroller** (epic gin-console-csp, REQ-UI-122):
  - `GraphCanvas`, `LaneGraphCanvas` and `LanesCanvas` are as tall as their content at the scale, plus 20px for the scroll bar. Their class is `isolate min-h-40 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded border`, so they scroll only sideways and the page is the one vertical scroller. Never give a canvas a viewport height (`h-[calc(100dvh-14rem)]`) or `overscroll-contain` again: the wheel over the canvas then never reached the page.
  - `useZoom` calls `preventDefault` on the wheel only with Ctrl/⌘. `fitWidth` fits the width only and floors to a whole percent, because rounding 41.5% up to 42% left the stage 4px wider than the canvas. In jsdom `clientWidth` is 0, so `fitWidth` returns 1; a test that needs a fit below 100% stubs `clientWidth`.
  - The Graph and Lanes views select nothing while `select` is absent, so no details panel opens until a click or Enter (REQ-UI-106).
- **Graph lane boxes** (epic gin-console-5qw, REQ-UI-117/118): when `hasLanes` holds for the Graph scope, `GraphView` draws `LaneGraphCanvas` from `laneGraph()` (`frontend/src/features/beads/laneGraph.ts`, pure) instead of the layers. "Only linked" is hidden.
  - **Tiers:** each lane box sits in the tier after the boxes it waits for. "No lane" is tiered like a lane through a sentinel node and comes last in its tier. Lanes in a loop share a tier. Since gin-console-csp (mockup C) tiers are columns from left to right, and the boxes of a tier stack top to bottom in the Lanes view row order (`LANE_GRAPH.tierGap` 140 minimum, `boxGap` 32).
  - **Arrows:** every cross-box dependency gets an arrow. An arrow to the next tier runs from the card's right edge to the waiting box's left edge, level with the waiting card. An arrow to a box that is not in a later tier, or that skips a tier, runs through a channel below every box, which grows the canvas.
  - **Tier gap zones:** a chip as wide as the gap can never avoid arrow verticals that share its x range, so a gap holds, left to right, the exit legs, a chip column as wide as the widest chip, the verticals to the next tier, the legs of entering channel arrows, and arrowhead room. Each arrow to the next tier gets its own row in the gap, at least 30px from a row with a chip. A card that is not in its box's last layer exits through the gap above its row.
  - **Chips:** a merge gate becomes a chip on its arrow, in the chip column of the tier gap; a channel arrow's chip sits on its channel row. Chips keep out of arrow ends and other arrows. Each gated arrow inside a box gets its own chip row, which grows the box.
  - **Invariant test:** `laneGraph.test.ts` runs the layout invariants (columns, chips in gaps, nothing through cards or header text, no chip over another arrow) over 300 seeded random graphs (mulberry32). It caught a chip over another arrow in 150 of 400 graphs that the fixtures missed. Known limits: a chip of a gated arrow inside a box can touch another arrow of that box, and a tier-skipping channel vertical can cross a channel chip (about 1 in 400 graphs).
  - **Colours:** colour slots come from the scope's sorted lane names (`laneSlots`), so filters never repaint a lane. Boxes use `--lane-1..8` through a `--box` style variable with static colour-mix classes.
  - **Keys:** Arrow keys move focus only and Enter selects, as REQ-UI-052 says. Left and Right move within the box and, from its first or last card, across tiers along the focused card's arrows (nearest by y), else to the nearest card by y of that tier. Up and Down move to the card nearest by x in the box above or below in the same tier.
  - **Shared code:** zoom lives in `useZoom`/`ZoomBar`, shared with `GraphCanvas`. `GRAPH_STATE_OF` in `lanes.ts` maps lane states to state marks for both lane views.
- **Example data:** `ex-e12` is added last in `build()` and swaps `p.rng` for its own `random.Random(12)`, because `long_text` draws from `p.rng` through `p.task` and would shift otherwise.

**Consequences**
- **Pull request state is not shown.** "Delivered" would need host data, so it is a possible cross-repo epic in gin-harness. A closed gate (with `metadata.merge_commit`) is the only merge trace in Beads.
- **A lane whose tracks are all closed gets no Lanes tab** until closed beads are loaded ("Show closed", a sprint, a closed milestone, or opening `view=lanes`).
- **The last column can be hidden.** At 1440px with the details panel open, the last column sits behind the horizontal scroll, as in the Graph. The panel no longer opens by default.
- **e2e:**
  - `stubApi` does not stub `/api/beads/<project>/<id>`, so `qa/e2e/support/lanes.ts` adds `stubDetails`, registered after `stubApi` because the later route wins.
  - Find the lanes SVG with `svg:has(polyline)`, because the headers hold lucide icons.
  - The search box has `role=searchbox`.
  - Focus "Next up" needs `ready` and a priority of at most 1.
  - A Board card needs `ready` to appear in the default columns.
  - The Gantt expand button reads "Show 1 child bead of <id>" in the singular.
- **Graph lane boxes, e2e and limits:**
  - **Selectors:** the layered `GraphCanvas` has no `data-arrow` (assert its arrows through the hidden list `aria-label="Dependencies"` and `data-dimmed`); in the lane canvas, boxes are `section[data-lane]` (`data-lane=""` is No lane), arrows are `path[data-arrow="from>to"]` (dashed for open gates), chips are `[data-chip]`. Cards, chips and the svg are siblings of the boxes, so check containment by geometry in page coordinates. `qa/e2e/support/lanes.ts` has `graphGeometry`/`graphCollisions`.
  - **Phone widths:** at 390px the Graph of `ex-e12` fits at 41%, near the 40% minimum, so text is very small; a wider graph stops at 40% and scrolls sideways.
  - **Spec wording:** write view scenarios against the existing view's interaction rules. The e2e specs caught two spec errors that the unit tests had followed.
- **gin-qa:**
  - `gin-qa cases new` takes the lowest free id, so do not probe with it.
  - `gin-qa tests run --type api <capability>` records every api case of that capability; pass TC ids.
  - Case steps need explicit URLs and one action each.
  - `gin-qa cases new` takes the lowest free id, so a case removed in the same change frees its id and a new case silently takes it over. Create the new cases first, or move them to ids from `gin-qa cases next-id`; never use `gin-qa cases renumber`, which shuffles the whole capability (gin-console-atl).
  - A rewritten case keeps its old `passed` Result lines until `gin-qa e2e run` or `gin-qa tests run` runs it again; a plain `npx playwright test` writes no Result.
  - A MODIFIED REQ can have scenarios without any case: REQ-UI-077 had none before gin-console-csp. Check coverage of every scenario of a modified REQ, not only the changed ones.
  - The Graph of `ex-e12` fits a 1920×1080 window, so a scenario that needs the page to scroll uses 1440×900 or more tracks (`tall()` in `qa/e2e/support/lanes.ts`).

**References**
- **Code:**
  - Backend: `backend/src/gin_console/beads/{lanes.py,models.py,source.py}`.
  - Frontend: `frontend/src/features/beads/{lanes.ts,laneGraph.ts,LaneGraphCanvas.tsx,LaneBox.tsx,useZoom.ts,LanesView.tsx,LanesCanvas.tsx,scope.ts,ScopeTrail.tsx,mergeGates.ts,laneFacts.ts,LaneChip.tsx,BeadsView.tsx}`.
  - Tests and data: `qa/e2e/support/lanes.ts` and `scripts/make_example_project.py`.
- **Specs:** REQ-BEADS-019 and REQ-UI-111 to REQ-UI-116. The change is in `docs/changes/archive/2026-11-20-gin-console-9ix-lanes-view/`.
- **Upstream:** gin-workflow `plugins/gin-workflow/src/skills/team/references/lanes.md`.
- **Beads:** gin-console-9ix (tracks .1–.8, bugs .9–.11), gin-console-5qw (lane boxes in the Graph, tracks .1–.5), gin-console-csp (one scroller, no default panel, tiers left to right, tracks .1–.5; REQ-UI-122, change `docs/changes/archive/2026-11-20-gin-console-csp-canvas-scroll/`) and gin-workflow-ifbt. Related records: [readable-ui](readable-ui.md), [e2e-parallel-runs-and-ellipsis](e2e-parallel-runs-and-ellipsis.md).

**Scope**
Any change to lanes, merge gates, team-mode data in Beads, or the Beads views' data wiring.
