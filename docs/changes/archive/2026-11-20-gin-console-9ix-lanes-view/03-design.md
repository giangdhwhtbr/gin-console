# Design: Lanes view

Epic: gin-console-9ix

## Architecture

- **Backend: lane fields (`backend/src/gin_console/beads/`)**
  - `lanes.py` (new, pure functions, no I/O):
    - `lane_of(description, labels) -> str | None`: the `Lane:` line, else the `lane:` label; name regex `^[a-z0-9][a-z0-9-]*$`, the same as gin-workflow's `_LANE_LINE`.
    - `track_of(description, labels) -> TrackRef | None`: the `Plan: <path>, Track <N>` line (gin-workflow's `_TRACK_LINE`), else the `track:<N>` label.
    - `claim_of(metadata) -> Claim | None`: the `metadata.claim` object or JSON string; `expires_at` must match `YYYY-MM-DDTHH:MM:SSZ` (gin-workflow's `_STAMP`).
    - `gate_of(title) -> tuple[str, int] | None`: the title regex `^external: (\S+)#(\d+)$` (gin-workflow's `_EXTERNAL`).
    - `is_merge_gate(row) -> bool`.
    - `gate_ref(snapshot, ident) -> GateRef | None`: the gate's plan and number, plus the `track_id` and `lane` of the track it waits for. The track is looked up among the children of the gate's parent, or, for a gate without a parent, among the children of the first bead it blocks. Doing this on the server gives the bead page, which has no bead list, the same answer as the views.
  - `models.py`: pydantic `TrackRef {plan: str | None, number: int}`, `GateRef {plan: str, number: int, track_id: str | None, lane: str | None}` and `Claim {holder: str, expires_at: datetime}`. `BeadSummary` gains `lane`, `track`, `claim` and `waits_for`, so `BeadDetail` inherits them. `Relation` (and so `ChildRelation`) gains `waits_for`.
  - `source.py`: `_fields` fills the four fields, and `ready` becomes false for a merge gate, next to the existing milestone rule. `_relation` adds `waits_for`.
  - `projects/source.py`: the counts leave out merge gates beside prep tasks.
  - `reports/source.py` `read_beads`: leaves out merge gates (`is_merge_gate`), which covers the selection of `build_report` and the team scope and its "has a track" rule.
- **Frontend: data (`frontend/src/features/beads/`)**
  - `api.ts`: `BeadSummary` gains `lane`, `track`, `claim` and `waits_for`, and `isSummary` checks them.
  - `mergeGates.ts` (new):
    - `isMergeGate(bead)`.
    - `withoutMergeGates(beads)`: used where milestones are already dropped, i.e. `BeadsView.tsx` for List/Board/Focus, the My Tasks data, the Gantt child beads (`features/milestones`) and `progressOf` and the child counts.
    - `gateTarget(gate, beads)`: the bead whose id is `gate.waits_for.track_id`, or `null`.
    - `gateWords(waitsFor)`: "be #2" or "track 7", used by the Graph node, the bead page and `RelationList`.
- **Frontend: Lanes view (`frontend/src/features/beads/`)**
  - `lanes.ts` (new, pure, unit-tested like `graph.ts`):
    - `lanesOf(beads, scopeId, matched, now) -> LaneBoard`. It returns rows (lane or "No lane", header facts, state, cards with columns), arrows (from, to, gate?) and markers.
    - Columns come from a longest-path pass over the drawn cards. The edges are their `blocked_by` among the scope's children, plus gate target → card, plus previous card → next card within a row. Rows hold their cards in order of (dependency layer, track number, id).
    - `routeArrow(from, to, grid)` returns orthogonal segments in the gutters. The segments leave the right edge of the blocker, run down or up in the column gap after it, run along the row gap above the target row, run down or up in the column gap before the target, and enter the left edge of the target. A same-row neighbour gets a straight segment.
    - `placeMarkers(arrows)` places one marker per gate arrow on its row-gap segment and moves markers apart along the gap, as `linkLabels` does for "n links".
    - `laneState(row, gates, now)` implements the ordered rules of REQ-UI-112 (see `docs/specs/ui/diagrams/lane-state.md`). The icon and colour come from `StateMark`:
      - All tracks closed: done.
      - Running: in progress.
      - Waiting and Blocked: blocked.
      - Not started and Idle: ready.
  - `LanesView.tsx` (new): resolves the scope as `GraphView` does (shared helper extracted from `GraphView.tsx` `scopeId`), calls `lanesOf`, and renders the empty and filter messages, the breadcrumb, the details panel and the sr-only list.
  - `LanesCanvas.tsx` (new):
    - **Layer order.** An opaque sticky header column sits above everything (`bg-card z-10`). Its width comes from a `useLaneHeaderWidth` hook: 168px under 1024px, else 240px, the same matchMedia pattern as `useLabelWidth`. Under it are one absolutely positioned layer of `GraphNodeButton` cards (184×64, the `NODE` gaps) and one SVG for the arrows and markers, drawn under the cards.
    - **Headers.** Each header renders the name and a `FactList` (inline).
    - **Keyboard.** The REQ-UI-114 keys (`laneStep`) with roving focus.
  - `filters.ts`, `ViewTabs.tsx`, `BeadsView.tsx`: `"lanes"` joins `VIEWS`. The tab is shown only when `hasLanes(beads, scopeId)`. `useBeads` is asked for closed beads when `view === "lanes"`.
- **Frontend: chip and merge gate look**
  - `LaneChip.tsx` (new, beside `PrepChip`): an outline badge with the lucide `Waypoints` icon and the name in a `span.truncate`, with `title="Lane <name>"`.
  - The chip is used in `ListRow.tsx`, `BeadCard.tsx`, `GraphNode.tsx`, the Gantt child row (`features/milestones`) and `BeadDetailPage.tsx`.
  - `labelChips(bead)` hides the `lane:`/`track:` labels that the fields already show.
  - `GraphNode.tsx`: a merge gate node has a dashed border, the lucide `GitMerge` icon, the gate words and the Waiting/Merged word. It keeps the state edge colour of the gate's status.
  - `BeadDetailPage.tsx`:
    - Every bead with them gets the facts Lane, Track and Lease.
    - A merge gate gets its own title and state words, plus the facts Placeholder and Waits for.
    - `RelationList.tsx` gives a gate its "Waits for … · merge pending|merged" words. The relation needs the gate's `waits_for`, which the backend `_relation` adds.
- **Example project (`scripts/make_example_project.py`)**
  - **Epic.** A new epic `ex-e12` "Team checkout" in the active milestone `ex-m2`. Its plan path is `.planning/plans/<today-3>-team-checkout.md`. Every track has the `Plan:` and `Lane:` lines and the `track:`/`lane:` labels.
  - **Lanes.**

    | Lane | Holder | Tracks |
    |---|---|---|
    | `be` | `ann`, claim expires tomorrow | T1 closed, T2 in_progress blocked by T1 |
    | `fe` | `bao` | T3 closed |
    | `qa` | unassigned | T4 open |
    | `infra` | `chi`, claim expired yesterday | T5 closed, T6 open blocked by T5 |
    | no lane | | 2 tasks, one closed |

  - **Merge gates.** Gate `#2` (open, parent `ex-e12`) and gate `#3` (closed, `merge_commit` metadata, no parent) block T4.
  - `check()` asserts the lane and gate counts.

## Data Flow

- **Lane fields.** The server reads the lane fields from the export rows (`docs/specs/beads/diagrams/lane-fields-activity.md`). No new endpoint or command.
- **Lanes view.** The view resolves the scope, groups the children, places the cards, routes the arrows and renders the header states (`docs/specs/ui/diagrams/lanes-view-activity.md`; lane state: `docs/specs/ui/diagrams/lane-state.md`).
- **Use case.** Following an epic's lanes is `docs/specs/ui/use-cases/follow-epic-lanes.md`.

## Error Handling

- **Malformed fields.** An unreadable `metadata.claim`, a bad lease time, a lane name outside the regex, or a `Track` line without a number gives `null` for that field. The bead still lists.
- **Unknown gate target.** A merge gate whose track is not among the scope's children gives a marker before the waiting card and no arrow (REQ-UI-113). The header then says "another lane".
- **Cycles.** A dependency cycle among the cards falls back to row order by track number for the cycle's cards, with the Graph's cycle warning (`cycleNodes`) above the view.
- **Scope without lanes.** The message with a link to Graph appears. A project or milestone scope gets the same message.
- **Large epics.** No limit is set; the canvas scrolls both ways inside the view (REQ-UI-061 keeps the page from scrolling sideways).

## Testing

- **pytest**
  - `test_beads_lanes.py`: REQ-BEADS-019 scenarios, the parsers on both claim forms, and the regexes against gin-workflow's examples.
  - `test_beads_source.py`: "REQ-BEADS-007 Merge gate is never ready".
  - `test_projects*.py`: "REQ-SERVER-006 Merge gates not counted".
  - `test_reports*.py`: REQ-REPORTS-001 and REQ-REPORTS-009 "merge gates left out".
  - Fixtures: `fake_export.bead(...)` with description, labels and metadata.
- **vitest**
  - `lanes.test.ts`: grouping, row order, columns (lane sequence and gates), the six states and their order, lease until/expired, routing that never enters a card or header rectangle, marker spacing, unknown gate target, and cycle fallback.
  - `mergeGates.test.ts`.
  - `LanesView.test.tsx`: tab offer, empty and filter messages, select, panel, keys and the sr-only list.
  - `LaneChip.test.tsx`.
  - REQ-UI-115/116 cases in the existing `ListView`, `BoardView`, `GraphNode`, `BeadDetailPage`, `MyTasks` and `GanttChart` tests.
- **Playwright**
  - New gin-qa cases from TC-UI-156 and TC-MILESTONE-UI-104 for the new scenarios, with specs under `qa/e2e/ui/` and `qa/e2e/milestone-ui/`.
  - `readability.spec.ts` gains the Lanes page group (stubbed `ex-e12` data).
  - The cases of the modified REQs are re-pinned.
- **TC-1**: `qa/e2e/readability-live.js` on the deployed console with `--project example` (Lanes of `ex-e12` included) at 390, 1024, 1440 and 1920px in both themes, plus screenshots of the Lanes view.

## Open Technical Questions
