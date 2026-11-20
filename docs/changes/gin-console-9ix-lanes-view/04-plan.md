# Plan: Lanes view

Epic: gin-console-9ix
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder; diagrams `docs/specs/beads/diagrams/lane-fields-activity.md`, `docs/specs/ui/diagrams/lanes-view-activity.md`, `docs/specs/ui/diagrams/lane-state.md`; use case `docs/specs/ui/use-cases/follow-epic-lanes.md`. gin-workflow reference: `../gin-workflow/plugins/gin-workflow/src/skills/team/references/lanes.md`, `.../scripts/workflow_core/team_pending.py:14-57` (`_TRACK_LINE`, `_LANE_LINE`, `track_lane`), `.../team_beads.py:20,59-89` (`_EXTERNAL`, `_STAMP`, `claim_of`).

## Objective
An epic whose tracks have lanes gets a Lanes view: one row per lane, with its state, holder, lease and progress. The tracks sit on dependency columns shared by every row, and arrows run in the gaps, with a Waiting or Merged marker where a lane waits for another lane's merge.

Elsewhere:
- Track beads show a lane chip in every view.
- Merge gates (`external: <plan>#<N>` placeholder beads) are not work. They are hidden from List, Board, Focus, My Tasks and the Gantt child rows, and left out of counts and reports. They show as a gate node in the Graph and as readable words on the bead page and in Dependencies.

Done when:
- Every scenario of the ADDED REQ-BEADS-019 and REQ-UI-111 to REQ-UI-116, and of the MODIFIED REQ-BEADS-007, REQ-SERVER-006, REQ-REPORTS-001, REQ-REPORTS-009, REQ-MILESTONE-UI-015, REQ-UI-030 and REQ-UI-110, has a test that names its REQ.
- `gin-qa cases check --change gin-console-9ix` prints `ok`.
- TC-1 passes on the deployed console, using the example project's epic `ex-e12`.

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
- **Problem statement:** gin-workflow's team mode (gin-workflow-ifbt, master 17743a82) delivers a member's tracks as a lane. The console shows neither who runs which tracks nor which lane waits for another lane's merge. Its placeholder beads also look like ready tasks.
- **Success criteria:**
  - Everything in the Objective.
  - The backend checks pass: `uv run --directory backend pytest`, `ruff check .`, `mypy`.
  - The frontend checks pass: `test --run`, `typecheck`, `lint`, `build`.
  - The existing e2e suites stay green.
  - `gin specs lint --change gin-console-9ix --against master` prints `ok`, and `gin specs trace --change gin-console-9ix` lists no missing REQ.
- **Global constraints** (from the spec and the user's decisions):
  - Read-only. The data comes from the `bd export` snapshot only: no new command, no gin-workflow change, no pull request state.
  - Lane fields: `lane` comes from the `Lane:` line, else the `lane:` label, matching `^[a-z0-9][a-z0-9-]*$`.
  - Track fields: `track` comes from the `Plan: <path>, Track <N>` line, else the `track:<N>` label.
  - Claim fields: `claim` comes from `metadata.claim` (an object or a JSON string), with `expires_at` written `YYYY-MM-DDTHH:MM:SSZ`.
  - Merge gates:
    - `waits_for` comes from a title matching `^external: (\S+)#(\d+)$`, with `track_id` and `lane` resolved on the server.
    - A merge gate is never `ready`.
    - It is left out of project counts, report selection and team scope. It is never a "track" of an epic.
  - Lanes view:
    - Offered only when the scope (resolved as in the Graph view) has a child with a lane. It always loads closed beads.
    - Header column: sticky, 168px under 1024px windows and 240px from 1024px.
    - Cards: Graph node content without the lane chip, 184×64.
    - Columns: shared by all rows. A card's column is after its blockers, after the tracks its gates wait for, and after the previous card in its row.
    - Arrows: orthogonal, only in the gaps.
    - Markers: "Waiting" or "Merged" in the row gaps. An unknown track gets "Waiting for track <N>" or "Merged track <N>" above the waiting card.
    - Lane state: All tracks closed, then Running, then Waiting for <lanes>, then Blocked, then Not started, then Idle; the first rule that applies wins.
    - Header facts: Held by, Lease ("until"/"expired" + `factDate`) and Tracks.
    - Keys: arrow keys move between cards. An sr-only list describes the lanes.
  - Readability (REQ-UI-110):
    - No text over text or lines.
    - Cut text ends with an ellipsis and has a `title`.
    - Contrast is at least 4.5:1, and no `opacity-*` on text.
    - Facts render through `FactList`.
    - Lessons in `.planning/knowledge/readable-ui.md`.
  - Lists with fixed columns switch by container query (`.planning/knowledge/container-queries-for-lists.md`).
  - No new dependency. Icons come from the existing lucide set (`Waypoints`, `GitMerge`, `Clock`, `Check`).
  - New and changed tests carry their REQ-ID.
- **Non-goals:**
  - PR state.
  - Lanes for a project or milestone scope.
  - Any Graph layout change other than the gate node.
  - Actions on lanes.
  - gin-workflow changes.
  - The milestone page's "<n> lanes".

## Approach Options
### Option 1: shared columns with orthogonal arrows in the gaps (HTML cards over one SVG)
- **Summary:** pure layout functions in `lanes.ts`:
  - Columns come from a longest path over blockers, gate targets and row order.
  - Arrows are routed through the column gaps and row gaps.
  - Markers are spaced along the row gaps.
  `LanesCanvas` renders a sticky header column, absolutely placed `GraphNodeButton` cards and one SVG.
- **Pros:**
  - Arrows from a waiting lane always run left to right and never cross a card.
  - No DOM measuring, so the layout is deterministic and can be unit-tested like `graph.ts`.
  - Reuses the node, the state marks and the details panel.
- **Cons:** the routing and marker spacing need careful tests.

### Option 2: swimlanes with text chips, no arrows
- **Summary:** one scrolling strip of cards per lane, with chips such as "Waits for be #2".
- **Pros:** simplest.
- **Cons:** you cannot see at a glance which lane waits for which. The user rejected it in discuss.

### Option 3: rotate the Graph canvas
- **Summary:** generalize `graph.ts` and `GraphCanvas` to lay out left to right in lane bands.
- **Pros:** reuses zoom and keys.
- **Cons:** risks the Graph view; the user rejected it in discuss.

### Recommended Approach
- **Selected option:** Option 1, confirmed in discuss on 2026-11-19.
- **Rationale:** it matches the confirmed design, keeps the Graph untouched, and keeps the geometry in pure functions with tests.
- **Planning decision:** the server resolves a merge gate's `track_id` and `lane` (REQ-BEADS-019), and relations carry `waits_for`. The bead page has only the bead detail, not the epic's beads, so this keeps one matching rule for every view. The spec delta was updated accordingly before this plan.

## Scope
- **In scope:** everything in the Objective and the Global constraints.
- **Out of scope:** the non-goals.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend), Track 2 (example data), Track 3 (frontend data, chip and gates in the lists, graph node and Gantt) and Track 6 (QA cases) share no file and run together; Track 4 (bead page) and Track 5 (Lanes view) build on Track 3 and run together once it merges; Track 7 (automated tests for the cases) needs the API of Track 1, the UI of Tracks 3-5 and the cases of Track 6; Track 8 checks the merged branch on the deployed console with Track 2's data.
```

## Tasks

### Track 1: Backend lane fields and merge gates
- **Dependencies**: none
- **Requirements**: REQ-BEADS-019, REQ-BEADS-007, REQ-SERVER-006, REQ-REPORTS-001, REQ-REPORTS-009
- **Files**:
  - Create `backend/src/gin_console/beads/lanes.py` (parsers and gate resolution, no I/O)
  - Modify `backend/src/gin_console/beads/models.py:13-60` (`TrackRef`, `GateRef` and `Claim`; four `BeadSummary` fields; `Relation.waits_for`)
  - Modify `backend/src/gin_console/beads/source.py:146-164` (`_fields`: the four fields; `ready` false for a gate)
  - Modify `backend/src/gin_console/beads/source.py:215-224` (`_relation`: `waits_for`)
  - Modify `backend/src/gin_console/projects/source.py:12-43` (`count_beads`: a gate set left out of every count, never in `prep`)
  - Modify `backend/src/gin_console/reports/source.py:50-72` (`read_beads`: skip rows where `is_merge_gate`)
  - Test: create `backend/tests/test_beads_lanes.py`
  - Test: modify `backend/tests/test_beads_source.py` (beside `test_beads_007_milestone_is_never_ready`, line 276)
  - Test: modify `backend/tests/test_beads_api.py` (relation carries `waits_for`)
  - Test: modify `backend/tests/test_collect.py` (beside `test_server_006_beads_counts_and_epics`, line 89)
  - Test: modify `backend/tests/test_reports_service.py` (beside line 118)
  - Test: modify `backend/tests/test_reports_team.py` (beside `test_reports_009_prep_tasks_left_out`, line 348)
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** parsers and filters with exact rules and scenarios. The only judgement is the gate's track lookup, which the spec defines.
- **Acceptance criteria**:
  - Every scenario of REQ-BEADS-019 has a test named for it; this includes "Track not found" and "Gate in the relations".
  - REQ-BEADS-007 "Merge gate is never ready", REQ-SERVER-006 "Merge gates not counted", REQ-REPORTS-001 "merge gates left out" and REQ-REPORTS-009 "merge gates left out" each have a test named for them.
  - The existing tests still pass unchanged.
  - `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
- **Estimated complexity**: medium

Interfaces produced (Tracks 3, 4, 5 and 7 consume the JSON):
```python
# beads/models.py (strict like BeadSummary)
class TrackRef(BaseModel):
    plan: Text | None
    number: int
class GateRef(BaseModel):
    plan: Text
    number: int
    track_id: Text | None = None
    lane: Text | None = None
class Claim(BaseModel):
    holder: Text
    expires_at: datetime          # built from "YYYY-MM-DDTHH:MM:SSZ" before validation (strict mode)
# BeadSummary gains: lane: Text | None = None; track: TrackRef | None = None; claim: Claim | None = None; waits_for: GateRef | None = None
# Relation gains:    waits_for: GateRef | None = None   (ChildRelation inherits it)

# beads/lanes.py
LANE_NAME: re.Pattern[str]          # ^[a-z0-9][a-z0-9-]*$
def lane_of(description: str, labels: Sequence[str]) -> str | None: ...
def track_of(description: str, labels: Sequence[str]) -> TrackRef | None: ...
def claim_of(metadata: object) -> Claim | None: ...
def gate_of(title: object) -> tuple[str, int] | None: ...        # ^external: (\S+)#(\d+)$
def is_merge_gate(row: Mapping[str, Any]) -> bool: ...
def gate_ref(snapshot: Snapshot, ident: str) -> GateRef | None: ...
```
JSON example: `"waits_for": {"plan": ".planning/plans/x.md", "number": 2, "track_id": "ex-e12.2", "lane": "be"}`, `"claim": {"holder": "ann@example.com", "expires_at": "2026-11-20T16:00:00Z"}`.

Steps:
1. Write `test_beads_lanes.py` covering the REQ-BEADS-019 scenarios through `list_beads` and `get_bead`. The rows come from `fake_export.bead(..., title=, description=, labels=, metadata=, dependencies=[dep(...)])`. Add tests for:
   - both claim forms, a bad stamp and an empty holder;
   - the backticked `Plan:` and `Lane:` forms;
   - a gate with a parent and a gate without one;
   - a lookup that falls back on the number when no `Plan:` lines exist, and none when two children share the number.

   Add the four MODIFIED-REQ tests named above. Run `uv run --directory backend pytest tests/test_beads_lanes.py tests/test_beads_source.py tests/test_collect.py tests/test_reports_service.py tests/test_reports_team.py tests/test_beads_api.py` (fails).
2. Implement `lanes.py`, then the models, then `_fields`, `_relation`, `count_beads` and `read_beads`.

   `gate_ref` finds the parent first. It is the gate's parent (`snapshot.parents`). Without one, it is the parent of the first bead, sorted by id, whose `blocks`/`blocked-by` dependency targets the gate (`snapshot.dependents` or the rows). The candidates are that parent's children that are not gates. The match is `track_of(...)` with the same plan and number; otherwise, when exactly one candidate has that number, that candidate.

   Run the tests (pass).
3. Run the full backend `pytest`, `ruff check .` and `mypy` (pass).
4. Commit: `git commit -m "feat(beads): lane, track, claim and merge gate fields (gin-console-9ix)"`

### Track 2: Example project epic with lanes
- **Dependencies**: none
- **Requirements**: REQ-UI-111, REQ-UI-112, REQ-UI-113 (data for their checks)
- **Files**:
  - Modify `scripts/make_example_project.py`:
    - New block for epic `e12` at the end of `build()`, before `long_text` and `return p.rows`, so the seeded random sequence of the existing data does not move.
    - `check()`, lines 711-759: lane and gate counts.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** data rows written with the existing `Project.add` and `Project.task` helpers, from an exact table.
- **Acceptance criteria**:
  - `python3 scripts/make_example_project.py --out /tmp/ex-9ix` prints `example project ready`.
  - In the output, `bd -C /tmp/ex-9ix list --parent ex-e12 --all --json` lists 8 tracks and the gate `#2`.
  - The data matches the table below. Every other bead id and field of the previous output is unchanged; compare with a run from `master` under the same `--today`, excluding the new rows.
- **Estimated complexity**: low

Data (plan path `P = .planning/plans/<today-3 ISO>-team-checkout.md`; every lane track has the description lines `Plan: P, Track <N>` and `Lane: <lane>` and the labels `lane:<lane>` and `track:<N>`):

| Bead | Lane | Status | Assignee | Other |
|---|---|---|---|---|
| epic `ex-e12` "Team checkout" | | in_progress | | parent milestone `ex-m2`, labels `roadmap`, `kind:capability` |
| T1 "Order API" | `be` | closed | ann | |
| T2 "Payment API" | `be` | in_progress | ann | blocked by T1; `metadata.claim` holder `ann@example.com`, expires tomorrow 16:00Z |
| T3 "Checkout page" | `fe` | closed | bao | |
| T4 "End-to-end checkout QA" | `qa` | open | none | blocked by gate #2 and gate #3 |
| T5 "Deploy pipeline" | `infra` | closed | chi | |
| T6 "Monitoring" | `infra` | open | chi | blocked by T5; `metadata.claim` holder `chi@example.com`, expired yesterday 09:00Z |
| T7 "Release notes" | none | open | dung | |
| T8 "Old checkout cleanup" | none | closed | dung | |
| gate `external: P#2` | | open | | parent `ex-e12`; blocks T4 |
| gate `external: P#3` | | closed | | no parent; blocks T4; `metadata.merge_commit` `3f2c1ab` |

Steps:
1. Add the block using `epic(...)` and `p.task(...)`. Pass `assignee=` and `metadata=`, with `collected=False` for closed tasks given their own metadata. Pass the gates through `p.add`, and the blockers through `deps=[(blocker_id, "blocks")]` in the direction that `Project.dep` uses for the existing e3 block.
2. Extend `check()`: 8 children of `ex-e12` that are not gates, 4 distinct `lane:` labels, and 2 rows whose title starts with `external: `.
3. Run the script into `/tmp/ex-9ix` and the comparison against `master` from the acceptance criteria.
4. Commit: `git commit -m "feat(example): epic with lanes and merge gates (gin-console-9ix)"`

### Track 3: Frontend lane data, lane chip, and merge gates in the lists, Graph node and Gantt
- **Dependencies**: none (consumes the JSON shape of Track 1 through fixtures)
- **Requirements**: REQ-UI-115, REQ-UI-116, REQ-MILESTONE-UI-015
- **Files**:
  - Modify `frontend/src/features/beads/api.ts`:
    - lines 5-54: the `TrackRef`, `GateRef` and `Claim` types, the four `BeadSummary` fields, and `Relation.waits_for`;
    - lines 66-136: `isSummary` and `isRelation` accept the fields when present (`isMissingOr`);
    - lines 103-113: `withMilestone` defaults the fields to `null`.
  - Create `frontend/src/features/beads/mergeGates.ts` (`isMergeGate`, `withoutMergeGates`, `gateTarget`, `gateWords`)
  - Create `frontend/src/features/beads/laneFacts.ts` (`visibleLabels`, `trackText`, `leaseOf`)
  - Create `frontend/src/features/beads/LaneChip.tsx`
  - Modify `frontend/src/features/beads/BeadsView.tsx:43` (`beads` without gates; `loaded` keeps them for Graph and Lanes)
  - Modify `frontend/src/features/beads/ListRow.tsx`: lines 76 and 100-106 (`LaneChip` next to `PrepChip`; label chips from `visibleLabels`)
  - Modify `frontend/src/features/beads/prep.ts:8-21` (`childCounts` skips gates)
  - Modify `frontend/src/features/beads/BeadCard.tsx:24-34` (`LaneChip`)
  - Modify `frontend/src/features/beads/GraphNode.tsx`: lines 7-67 (a `showLane` prop, `true` by default, for the chip on the state line; the gate look)
  - Modify `frontend/src/features/beads/graph.ts:65-76` (`progressOf` skips gates)
  - Modify `frontend/src/features/my-tasks/load.ts:46` (`withoutMergeGates`)
  - Modify `frontend/src/features/milestones/GanttTab.tsx:37` (`childrenOf(withoutMergeGates(...))`)
  - Modify `frontend/src/features/milestones/GanttChart.tsx:521` (`LaneChip` in `ChildRow`)
  - Modify the fixtures: `frontend/src/features/beads/beadFixtures.ts:8-35` and `frontend/src/features/milestones/milestoneFixtures.ts:57` (the new fields default to `null`)
  - Modify the full `BeadSummary` literals in `BeadsPage.test.tsx:37`, `api.test.ts:33`, `BeadDetailPage.test.tsx:59`, `Discussion.test.tsx:55` and `filters.test.ts:31`
  - Test: create `frontend/src/features/beads/{mergeGates,laneFacts}.test.ts` and `frontend/src/features/beads/LaneChip.test.tsx`
  - Test: modify `frontend/src/features/beads/{ListView,BoardView,GraphNode,GraphView}.test.tsx` and `frontend/src/features/beads/graph.test.ts`
  - Test: modify `frontend/src/features/my-tasks/load.test.ts` and `frontend/src/features/milestones/GanttChart.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** one predicate and one chip applied at the places listed above, following the existing `PrepChip` and milestone-filter patterns; the scenarios give exact words.
- **Acceptance criteria**:
  - Named tests cover:
    - the REQ-UI-115 scenarios "Chip in every view" (List, Board, Graph and Gantt parts) and "Bead without a lane";
    - the REQ-UI-116 scenarios "Not on the Board", "Not counted as a child" and "Merge gate node";
    - the REQ-MILESTONE-UI-015 scenario "merge gate and lane", plus the existing Gantt scenarios.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: medium

Interfaces produced (Tracks 4 and 5 consume them):
```ts
// api.ts
export type TrackRef = { plan: string | null; number: number };
export type GateRef = { plan: string; number: number; track_id: string | null; lane: string | null };
export type Claim = { holder: string; expires_at: string };
// BeadSummary gains: lane: string | null; track: TrackRef | null; claim: Claim | null; waits_for: GateRef | null
// Relation gains:    waits_for?: GateRef | null
// mergeGates.ts
export const isMergeGate: (bead: { waits_for?: GateRef | null }) => boolean;
export function withoutMergeGates<T extends { waits_for?: GateRef | null }>(beads: readonly T[]): T[];
export function gateTarget(gate: BeadSummary, beads: readonly BeadSummary[]): BeadSummary | null; // by waits_for.track_id
export function gateWords(gate: GateRef): string;   // "be #2" | "track 7"
export const gateState = (status: string): "Waiting" | "Merged";  // closed -> Merged
// laneFacts.ts
export function visibleLabels(bead: Pick<BeadSummary, "labels" | "lane" | "track">): string[]; // drops lane:<x> when lane, track:<n> when track
export function trackText(track: TrackRef): string;  // "#2 2026-11-17-team-checkout.md" | "#3"
export function leaseOf(claims: readonly (Claim | null)[], now: Date): { text: string; expired: boolean } | null; // latest expires_at; "until 20 Nov 2026 16:00" | "expired 18 Nov 2026 09:00" via factDate
// LaneChip.tsx
export function LaneChip({ lane }: { lane: string }): JSX.Element; // outline Badge, Waypoints icon, span.truncate, title "Lane <lane>"
// GraphNode.tsx
// GraphNodeButton gains showLane?: boolean (default true). A gate node gets a dashed border and a GitMerge icon; its title reads "Waits for <gateWords> to merge" and its state word is gateState(status).
```

Steps:
1. Tests first:
   - units for `mergeGates`, `laneFacts` and `LaneChip`;
   - in `ListView`/`BoardView`: a gate absent, a lane chip present, no `lane:`/`track:` chip;
   - in `GraphNode`: the chip on a track, the gate look and words;
   - in `graph.test`: `progressOf` ignores a gate child;
   - in `load.test`: My Tasks without gates;
   - in `GanttChart`: "0/1 closed", the chip, no gate row.

   Run `pnpm -C frontend test --run src/features/beads src/features/my-tasks src/features/milestones` (fails).
2. Implement the types, the fixture defaults, then the helpers, then the views. Run the tests (pass).
3. Run the full frontend `test --run`, `typecheck`, `lint` and `build` (pass).
4. Commit: `git commit -m "feat(beads): lane chip and merge gates in the lists, graph and gantt (gin-console-9ix)"`

### Track 4: Bead page facts, merge gate page and Dependencies words
- **Dependencies**: Track 3
- **Requirements**: REQ-UI-115, REQ-UI-116
- **Files**:
  - Modify `frontend/src/features/beads/BeadDetailPage.tsx`:
    - lines 85-94: facts Lane, Track and Lease; for a gate, Placeholder and Waits for;
    - lines 96-100: `childCounts` skips children with `waits_for`;
    - lines 146-169: a gate's title and state words; `LaneChip` in the badge row; labels from `visibleLabels`.
  - Modify `frontend/src/features/beads/RelationList.tsx:29-39`: a relation with `waits_for` reads "Waits for <gateWords> · merge pending|merged" in place of its title and status badge.
  - Test: modify `frontend/src/features/beads/BeadDetailPage.test.tsx` and `frontend/src/features/beads/DetailsPanel.test.tsx`; create `frontend/src/features/beads/RelationList.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** additions to one page and one list, built from Track 3's helpers, with exact texts.
- **Acceptance criteria**:
  - Named tests cover the REQ-UI-115 scenarios "Facts" and "Chip in every view" (bead page part), and the REQ-UI-116 scenario "Dependencies of a track" plus the gate page words. Both the page and the details panel are covered.
  - The full frontend checks pass.
- **Estimated complexity**: low

Steps:
1. Write the tests. Run `pnpm -C frontend test --run src/features/beads/BeadDetailPage.test.tsx src/features/beads/RelationList.test.tsx src/features/beads/DetailsPanel.test.tsx` (fails).
2. Implement, then run them again (pass), then run the full frontend checks (pass).
3. Commit: `git commit -m "feat(beads): lane facts and merge gate words on the bead page (gin-console-9ix)"`

### Track 5: Lanes view
- **Dependencies**: Track 3
- **Requirements**: REQ-UI-111, REQ-UI-112, REQ-UI-113, REQ-UI-114, REQ-UI-030
- **Files**:
  - Create `frontend/src/features/beads/scope.ts`: `scopeOf`, extracted from `GraphView.tsx:27-33`, which then calls it.
  - Create `frontend/src/features/beads/lanes.ts`: pure layout, state and keys.
  - Create `frontend/src/features/beads/LanesView.tsx`: the scope, messages, breadcrumb, panel and sr-only list.
  - Create `frontend/src/features/beads/LanesCanvas.tsx`: the sticky headers, cards, SVG arrows and HTML markers.
  - Create `frontend/src/features/beads/useLaneHeaderWidth.ts`: one `(min-width: 1024px)` query, 240px as the jsdom fallback, after `features/milestones/useLabelWidth.ts`.
  - Modify `frontend/src/features/beads/filters.ts:4`: `"lanes"` joins `VIEWS`.
  - Modify `frontend/src/features/beads/ViewTabs.tsx:4-19`:
    - add a `lanes: boolean` prop;
    - add `TITLES.lanes = "Lanes"`;
    - hide the tab when `lanes` is false.
  - Modify `frontend/src/features/beads/BeadsView.tsx`:
    - lines 34-38: request closed beads when `view === "lanes"`;
    - line 65: `lanes={hasLanes(loaded, scopeOf(...))}`;
    - lines 75-98: the `lanes` branch, given `beads={loaded}` and `matched` computed with `closed: true`.
  - Modify `frontend/src/features/beads/graph.ts:126`: `export` `cycleNodes`.
  - Modify `frontend/src/features/beads/StateMark.tsx`: export `StateWord({ state, words })`, which draws the icon of a `GraphState` in its colour with the given words.
  - Test: create `frontend/src/features/beads/{lanes.test.ts,LanesView.test.tsx,LanesCanvas.test.tsx,scope.test.ts}`
  - Test: modify `frontend/src/features/beads/{ViewTabs,BeadsPage,GraphView}.test.tsx` and `frontend/src/features/beads/filters.test.ts`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** intricate pure geometry with many edge cases:
  - columns under three kinds of edges, with a fallback for cycles;
  - orthogonal routing that must never enter a card or header rectangle;
  - marker spacing;
  - six ordered state rules;
  - keys across rows.
  It is bounded to one new view with an exact spec and checked in a real browser.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-111, REQ-UI-112, REQ-UI-113 and REQ-UI-114, and the REQ-UI-030 scenario "Lanes tab", has a test named for it. The geometry scenarios are tested on `lanesOf` output: no arrow segment intersects a card or header rectangle, and no two markers intersect.
  - An ad-hoc Playwright run of `qa/e2e/support/readability-inpage.js` on the built UI finds nothing on the Lanes view of `ex-e12`. It runs against a temporary console on port 8716, with the example project regenerated by Track 2's script into `/tmp/ex-9ix`, at 390, 1024, 1440 and 1920px in both themes. Before Track 2 merges, run the script from its branch.
  - The full frontend checks pass.
- **Estimated complexity**: high

Interfaces:
```ts
// scope.ts
export function scopeOf(beads: readonly BeadSummary[], filters: BeadFilters, milestone: string): string | null;
// lanes.ts
export const LANE = { cardW: 184, cardH: 64, rowH: 112, gapX: 48, gapY: 32, padX: 16, padY: 32 } as const; // rowH fits a header of name + 4 facts at 168px; raise this one constant if the readability check finds a header taller
export type LaneStateKind = "closed" | "running" | "waiting" | "blocked" | "not_started" | "idle";
export type LaneState = { kind: LaneStateKind; words: string };      // "All tracks closed" | "Running" | "Waiting for be, fe" | "Blocked" | "Not started" | "Idle"
export type LaneCard = { bead: BeadSummary; row: number; column: number; x: number; y: number };
export type LaneRow = {
  lane: string | null;                       // null = "No lane"
  top: number;
  cards: LaneCard[];
  tracks: { closed: number; total: number }; // all tracks of the lane, whatever the filters
  state: LaneState | null;                   // null for "No lane"
  holders: string[];                         // [] -> "Unclaimed"; not shown when state.kind === "closed"
  lease: { text: string; expired: boolean } | null;
};
export type Point = { x: number; y: number };
export type LaneArrow = { from: string; to: string; gate: BeadSummary | null; points: Point[] };
export type LaneMarker = { gate: BeadSummary; to: string; words: string; x: number; y: number; w: number }; // "Waiting" | "Merged" | "Waiting for track 7" | "Merged track 7"
export type LaneBoard = { rows: LaneRow[]; arrows: LaneArrow[]; markers: LaneMarker[]; cycle: string[]; width: number; height: number };
export function hasLanes(beads: readonly BeadSummary[], scopeId: string | null): boolean;
export function lanesOf(beads: readonly BeadSummary[], scopeId: string, matched: ReadonlySet<string>, now: Date): LaneBoard;
export function laneState(tracks: readonly BeadSummary[], cardsInOrder: readonly BeadSummary[], gatesOf: (id: string) => BeadSummary[], now: Date): LaneState;
export function laneStep(board: LaneBoard, id: string, key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown"): string | null;
export function laneSummary(board: LaneBoard): string[]; // "be: Running, held by ann, lease until …, 1/2 closed"; "qa #4 waits for be #2: merge pending"
```

Geometry (all in `lanes.ts`):
- **Placement:** `x(column) = padX + column·(cardW+gapX)`; `rowTop(r) = padY + r·(rowH+gapY)`; a card's `y = rowTop(r) + (rowH−cardH)/2`.
- **Gaps:** the column gap after column `c` is `gx(c) = x(c)+cardW+gapX/2`; the row gap above row `r` is `gy(r) = rowTop(r)−gapY/2`.
- **Columns:**
  - First, the dependency layers: a longest path over the drawn cards' blockers and the gate edges `gateTarget → card`, with back edges ignored.
  - Next, the order of cards in each row: by (layer, track number, id).
  - Last, the columns: the same longest path with the edges `previous card → next card` of each row added.
- **Arrow routing:**
  - From A at (row ra, column ca) to B at (rb, cb), where cb > ca by construction.
  - When ra = rb and cb = ca+1, the arrow is a straight line from A's right middle to B's left middle.
  - Otherwise it follows A's right middle → (gx(ca), A mid) → (gx(ca), gy(rb)) → (gx(cb−1), gy(rb)) → (gx(cb−1), B mid) → B's left middle. Repeated points are removed.
- **Markers:**
  - **Size:** 20px high; 84px wide for "Waiting"/"Merged", 152px for the "… track N" words.
  - **Placement:** a gate arrow's marker is centred on its `gy(rb)` segment. The marker of a gate whose track is not drawn sits at `gy(rb)`, starting at B's left edge.
  - **Spacing:** markers in one gap are pushed right by 8px steps until they no longer intersect.
  - **Rendering:** markers are opaque HTML chips with a border, drawn above the SVG, with an icon (`Clock` for Waiting, `Check` for Merged) and the words.
- **Sizes:** `width` = the last column's right edge + `padX`; `height` = the last row's bottom + `padY`.

Steps:
1. Write `lanes.test.ts` with an `ex-e12`-shaped fixture covering:
   - rows and order, columns, closed cards drawn, filters;
   - every state rule with its order;
   - holders, and lease until/expired;
   - straight and routed arrows: no segment inside any card or header rectangle;
   - markers that do not intersect; the unknown-track marker;
   - cycle fallback, `laneStep` and `laneSummary`.

   Write `scope.test.ts`, `ViewTabs`/`filters` tab tests, and `LanesView`/`LanesCanvas` tests (tab offered, the no-lanes message with its Graph link, "No beads match these filters", select and panel, keys, sr-only list). Run `pnpm -C frontend test --run src/features/beads` (fails).
2. Implement `scope.ts` (keep the `GraphView` tests green), `lanes.ts`, then the view, canvas and wiring. Run the tests (pass).
3. Build, then check with the readability detector as in the acceptance criteria; iterate on `LANE` and the CSS until it is clean.
4. Run the full frontend checks (pass).
5. Commit: `git commit -m "feat(beads): lanes view of an epic (gin-console-9ix)"`

### Track 6: QA cases
- **Dependencies**: none
- **Requirements**: REQ-BEADS-019, REQ-BEADS-007, REQ-SERVER-006, REQ-REPORTS-001, REQ-REPORTS-009, REQ-MILESTONE-UI-015, REQ-UI-030, REQ-UI-110, REQ-UI-111, REQ-UI-112, REQ-UI-113, REQ-UI-114, REQ-UI-115, REQ-UI-116
- **Files**:
  - Create cases for each new scenario:
    - `api` cases for REQ-BEADS-019, REQ-BEADS-007, REQ-SERVER-006, REQ-REPORTS-001 and REQ-REPORTS-009 in `qa/cases/{beads,server,reports}/`;
    - `e2e` cases for REQ-UI-111 to REQ-UI-116 and REQ-UI-030 from TC-UI-156 in `qa/cases/ui/`;
    - `e2e` cases for REQ-MILESTONE-UI-015 from TC-MILESTONE-UI-104 in `qa/cases/milestone-ui/`.
  - Modify and re-pin the 31 stale cases that `gin-qa cases plan --change gin-console-9ix` lists. Change their text only where the spec changed it.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** mechanical case writing from written scenarios.
- **Acceptance criteria**: `gin-qa cases check --change gin-console-9ix` prints `ok`, and `gin-qa cases check` shows no new finding.
- **Estimated complexity**: low

Steps:
1. Run `gin-qa cases plan --change gin-console-9ix`, then write, update and re-pin the cases per `qa/guidelines.md` and the `gin-qa:cases` skill.
2. Run `gin-qa cases check --change gin-console-9ix` (ok).
3. Commit: `git commit -m "test(qa): cases for the lanes view and merge gates (gin-console-9ix)"`

### Track 7: Automated tests for the cases
- **Dependencies**: Track 1, Track 3, Track 4, Track 5, Track 6
- **Requirements**: REQ-BEADS-019, REQ-BEADS-007, REQ-SERVER-006, REQ-REPORTS-001, REQ-REPORTS-009, REQ-MILESTONE-UI-015, REQ-UI-030, REQ-UI-110, REQ-UI-111, REQ-UI-112, REQ-UI-113, REQ-UI-114, REQ-UI-115, REQ-UI-116
- **Files**:
  - Modify `qa/e2e/support/api.ts:31-69` (`BeadSummary` and `bead()` gain the four fields, defaulting to `null`)
  - Create a Playwright spec per new `e2e` case: `qa/e2e/ui/tc-ui-<n>.spec.ts` and `qa/e2e/milestone-ui/tc-milestone-ui-<n>.spec.ts`, stubbed with `stubApi`
  - Modify `qa/e2e/ui/readability.spec.ts`:
    - lines 25-39: `ex-e12` data with lanes, claims and gates in `beads`;
    - lines 180-211: a group `'beads lanes'` that visits `/beads?project=example&milestone=all&view=lanes&scope=ex-e12`.
  - Create or modify `backend/tests/test_*_api.py` tests for the new `api` cases, naming the case ids, per the `### api` type in `qa/guidelines.md`
  - Modify `qa/e2e/readability-live.js:32-57` (`pagesOf`):
    - for the first epic with a child whose `lane` is not `null`, add `beads lanes <id>` at `/beads?project=<p>&milestone=all&view=lanes&scope=<id>`;
    - add the bead page of one lane track and of one merge gate.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** specs and API tests in the existing patterns, one per written case, run against the built UI.
- **Acceptance criteria**:
  - The new specs and `readability.spec.ts` pass against the built UI on :8701, with `npx playwright test qa/e2e/ui qa/e2e/milestone-ui --trace off`. The existing e2e suites still pass.
  - `node qa/e2e/readability-live.js --base <temporary console> --project example` lists the `beads lanes ex-e12` page.
  - The `gin-qa tests` run for the `api` cases passes.
  - `gin-qa cases check` prints `ok`.
- **Estimated complexity**: medium

Steps:
1. Run `gin-qa e2e plan` and `gin-qa tests plan --type api`. Write the specs and tests per the `gin-qa:e2e` and `gin-qa:tests` skills. Build the UI (`pnpm -C frontend build`), run them, and fix the specs until they pass.
2. Extend `readability.spec.ts` and `readability-live.js`, and run the spec (pass).
3. Commit: `git commit -m "test(e2e): lanes view, lane chip and merge gate cases (gin-console-9ix)"`

### Track 8: Check on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3, Track 4, Track 5, Track 6, Track 7
- **Requirements**: REQ-UI-110, REQ-UI-111, REQ-UI-113
- **Files**:
  - Modify `docs/changes/gin-console-9ix-lanes-view/05-tests.md` (TC-1 result)
  - Create `qa/evidence/<date>-9ix-tc1/` (findings and screenshots)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** run the written check and record it.
- **Acceptance criteria**: TC-1 is recorded as passed, by claude, with Playwright on the deployed build of `<commit>`, 0 findings, and screenshots of the Lanes view at 390 and 1440px.
- **Estimated complexity**: low

Steps:
1. Regenerate the example project with the merged script: `python3 scripts/make_example_project.py`, using the default `--out` (the configured `example` path).
2. Deploy the merged branch: `pnpm -C frontend build && uv --directory backend sync && systemctl --user restart gin-console`; `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/projects` prints 200.
3. Run `node qa/e2e/readability-live.js --base http://127.0.0.1:8700 --project example --out qa/evidence/<date>-9ix-tc1`. It must report no finding, its page list including `example beads lanes ex-e12` (Track 7). Take screenshots of `/beads?project=example&view=lanes&scope=ex-e12` at 390 and 1440px, in both themes.
4. Record TC-1 in `05-tests.md` and commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-9ix)"`

## Integration
- **Branch**: `feat/lanes-view`
- **Merge strategy**: parallel-then-merge.
  - Tracks 1, 2, 3 and 6 run in worktrees on `feat/lanes-view-t<N>`.
  - Tracks 4 and 5 start after Track 3 merges into `feat/lanes-view`; their track branches merge `feat/lanes-view` first.
  - Track 7 starts after Tracks 1, 3, 4, 5 and 6 merge.
  - Merge order: 1, 2, 3, 6, 4, 5, 7.
  - Track 8 runs on the merged branch.

## Validation
- [ ] `uv run --directory backend pytest`, `uv run --directory backend ruff check .` and `uv run --directory backend mypy` pass
- [ ] `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint` and `pnpm -C frontend build` pass
- [ ] `npx playwright test --trace off` passes, readability spec included
- [ ] `gin specs lint --change gin-console-9ix --against master` prints `ok`, and `gin specs trace --change gin-console-9ix` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-9ix` prints `ok`
- [ ] TC-1 passes on the deployed console

## Notes
- Track beads close after tests and review pass. Only the epic `gin-console-9ix` waits for the human-confirmed merge at ship.
- The user may override `Model:` and `Effort:` before approval.
