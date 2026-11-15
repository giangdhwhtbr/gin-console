# Plan: UI polish: long text, long ids and graph layout

Epic: gin-console-21h
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder.

## Objective
Long titles, ids, names and Markdown stay readable at 1440px and 390px, and no page scrolls sideways:
- Ids longer than 24 characters are shortened to the first 14, "…" and the last 9.
- Every ellipsis has a `title`.
- Graph nodes without arrows are grouped in rows of 3 below the layers.
- A milestone without dates no longer breaks the Milestones page.

Every scenario of the 1 ADDED and 8 MODIFIED REQs has a test naming its REQ. `gin-qa cases check --change gin-console-21h` prints `ok`. TC-1, the long-text sweep, finds no layout problem.

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
- **Problem statement:** the long-text sweep of the example project (`qa/evidence/2026-11-15-long-text/` and `-2/`) found these layout bugs:
  - The List view loses the title.
  - Board cards and phone pages scroll sideways.
  - Graph nodes clip their title, and long child ids look the same.
  - The Gantt label is squeezed on a phone.
  - Reports selects overflow the page.
  - Cut text has no tooltip.
  - One undated milestone gives a 502 for the whole Milestones page.
  
  In addition, unlinked graph nodes sit in one wide row.
- **Success criteria:**
  - Everything in the Objective.
  - Backend: `pytest`, `ruff check .` and `mypy` pass.
  - Frontend: `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
  - `gin specs lint --change gin-console-21h --against master` prints `ok`, and `gin specs trace --change gin-console-21h` lists no missing REQ.
- **Global constraints** (from the spec):
  - `shortId(id)` returns an id of 24 characters or fewer unchanged, and otherwise `id.slice(0, 14) + "…" + id.slice(-9)`. The full id is always the `title`.
  - Unbroken words wrap with Tailwind 4.3 `wrap-anywhere`.
  - Every `truncate` that shows user text has a `title`.
  - No page scrolls sideways at 360px and wider. Markdown tables and code scroll in their own box (`.markdown pre` and `.markdown table` already have `overflow-x: auto`; their columns need `min-w-0`).
  - List titles stay at least 8rem wide.
  - Graph nodes keep `NODE.h`. Their state line stays on one line, and "n of m done" stays in full.
  - Linked graph nodes keep the layer and barycenter rules. Unlinked nodes are sorted by priority, then id, and placed below the last layer in rows of 3 under "n without dependencies". "Only linked" hides them as today.
  - Under 1024px the second line of a Gantt label wraps. From 1024px up, behaviour is unchanged.
  - The Reports selects are no wider than their panel.
  - `MilestoneEntry.start` and `.end` may be `null` in the backend and the frontend. The list shows "No dates" and the entry's `error`.
  - Read-only. No new dependency. The Windows and macOS paths are untouched. New and changed tests carry their REQ-ID.
- **Non-goals:**
  - Middle truncation of titles.
  - New node sizes.
  - Changing gin-workflow.
  - Opening an undated milestone beyond showing gin's error.

## Approach Options
### Option 1: one shared helper and utility classes in each view
- **Summary:** `lib/shortId.ts` plus class and `title` changes where each bug is, and a grouped placement in `graph.ts`.
- **Pros:** small, local diffs that follow existing patterns. jsdom tests assert the classes and titles, and TC-1 checks the real layout.
- **Cons:** the long-text rule is applied in many places by hand.

### Option 2: a `<Clipped>` component that renders truncate plus title everywhere
- **Pros:** one place enforces the tooltip.
- **Cons:** it touches every truncated element in the app, a wider diff than the bugs need. That is YAGNI for this epic.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** it is the design confirmed on 2026-11-15 (`03-design.md`).

## Scope
- **In scope:**
  - Frontend:
    - `frontend/src/lib/shortId.ts` (new);
    - `features/beads/{ListRow.tsx,BeadCard.tsx,BeadDetailPage.tsx,GraphNode.tsx,GraphPage.tsx,GraphView.tsx,graph.ts,GraphCanvas.tsx}`;
    - `features/milestones/{api.ts,MilestonesPage.tsx,GanttChart.tsx}`;
    - `features/reports/{BarRows.tsx,ReportsPage.tsx,team/TeamSection.tsx}`;
    - the tests of each.
  - Backend: `backend/src/gin_console/milestones/models.py` and `backend/tests/test_milestones_api.py`.
  - QA cases under `qa/cases/`.
  - `05-tests.md`.
- **Out of scope:**
  - gin-workflow;
  - the Sessions and Quota pages;
  - node size;
  - title middle truncation.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (long text in the Beads views, with shortId), Track 2 (graph grouping in graph.ts and GraphCanvas) and Track 4 (QA cases) share no file and run together; Track 3 (milestones and reports) uses Track 1's shortId and waits for it; Track 5 sweeps the merged branch.
```

## Tasks

### Track 1: Long text in the Beads views
- **Dependencies**: none
- **Requirements**: REQ-UI-107, REQ-UI-044, REQ-UI-049, REQ-UI-065
- **Files**:
  - Create `frontend/src/lib/shortId.ts` and `frontend/src/lib/shortId.test.ts`
  - Modify `frontend/src/features/beads/ListRow.tsx:52-102`:
    - the id `min-w-0 truncate` with `shortId` and `title`;
    - the title `min-w-32` with `title`;
    - the assignee `title`.
  - Modify `frontend/src/features/beads/BeadCard.tsx:~10-25`:
    - the id with `shortId` and `title`;
    - the title Link and assignee `wrap-anywhere`.
  - Modify `frontend/src/features/beads/BeadDetailPage.tsx:132-165`:
    - the `h1` `wrap-anywhere`;
    - the id `wrap-anywhere`;
    - the owner and assignee line `wrap-anywhere`;
    - the Markdown column `min-w-0`.
  - Modify `frontend/src/features/beads/GraphNode.tsx:42-60`:
    - the id with `shortId`;
    - the status row `whitespace-nowrap min-w-0`, the state label `min-w-0 truncate`, and "n of m done" `shrink-0`.
  - Modify `frontend/src/features/beads/GraphPage.tsx:51` and `frontend/src/features/beads/GraphView.tsx` (grid columns): add `min-w-0` to the side panel `aside` so its Markdown scrolls in its own box.
  - Test `ListView.test.tsx`, `BeadCard.test.tsx`, `BeadDetailPage.test.tsx`, `GraphCanvas.test.tsx` (node content), `MarkdownView.test.tsx` as needed.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** many small class and `title` edits plus one pure helper, with clear scenarios. The List row needs care so that the control, the id and the title share the width as specified.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-107 and the new scenarios of REQ-UI-044, REQ-UI-049 and REQ-UI-065 have passing tests naming their REQ.
  - The existing tests pass.
  - The four frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced (Track 3 consumes `shortId`):
```ts
// frontend/src/lib/shortId.ts
/** REQ-UI-107: an id longer than 24 characters as its first 14, "…" and its last 9; shorter ids unchanged. */
export function shortId(id: string): string {
  return id.length <= 24 ? id : `${id.slice(0, 14)}…${id.slice(-9)}`;
}
```

Steps:
1. **`shortId.test.ts`** (REQ-UI-107):
   - `shortId("ex-payments-provider-migration-and-reconciliation-2026.2.1")` is `"ex-payments-pr…-2026.2.1"`.
   - `shortId("ex-e4.1")` is `"ex-e4.1"`.
   - A 24-character id is unchanged.
   - A 25-character id becomes 24 characters.
   
   Run `pnpm -C frontend test --run src/lib/shortId.test.ts` and expect it to fail. Implement, then run it again and expect it to pass.
2. **`ListView.test.tsx`**, "Long id keeps the title" (REQ-UI-044, REQ-UI-107). Use the epic `ex-payments-provider-migration-and-reconciliation-2026` with one open child. The row:
   - shows its open/close button;
   - shows the id text `ex-payments-pr…tion-2026` with `title` set to the full id;
   - has the title span with class `min-w-32` and `title` set to the full title.
   
   Implement in `ListRow.tsx`. The id span becomes `<span className="min-w-0 shrink truncate font-mono text-xs text-muted-foreground" title={bead.id}>{shortId(bead.id)}</span>`. The title span becomes `min-w-32 truncate font-medium` with `title={bead.title}`. The assignee cell gets `title`.
3. **`BeadCard.test.tsx`** (REQ-UI-065, REQ-UI-107): the card shows `shortId(id)` with `title`, and the title Link and assignee have the class `wrap-anywhere`. Implement.
4. **`BeadDetailPage.test.tsx`** (REQ-UI-107, "Unbroken title on a phone" and "Wide table on a phone"): the `h1` has `wrap-anywhere`, and the element holding the Markdown has `min-w-0`. Implement. jsdom does not lay out, so these class assertions are the contract, and TC-1 checks the real layout.
5. **Node test** in `GraphCanvas.test.tsx` (REQ-UI-049, "Long state line"): a node of an in-progress epic with 2 of 5 tracks done shows "2 of 5 done" in a `shrink-0` element. The status row has `whitespace-nowrap`, and the id is shortened with `title`. Implement in `GraphNode.tsx`.
6. Add `min-w-0` to the side-panel `aside` and the graph column in `GraphPage.tsx` and `GraphView.tsx`.
7. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint` and `pnpm -C frontend build`. Expect all to pass. Commit: `git commit -m "fix(beads): long ids and unbroken text in the Beads views (gin-console-21h)"`

### Track 2: Unlinked graph nodes in rows of 3
- **Dependencies**: none
- **Requirements**: REQ-UI-048
- **Files**:
  - Modify `frontend/src/features/beads/graph.ts`:
    - L30-41, the `GraphNode` type gains `group`;
    - L170-236, `layout()` splits linked and unlinked nodes;
    - L333-358, `place()` places the group.
  - Modify `frontend/src/features/beads/GraphCanvas.tsx`, around L32 and L88-140: the heading "n without dependencies" above the group.
  - Test `graph.test.ts` and `GraphCanvas.test.tsx`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded change to a pure layout function with clear scenarios. The layer and barycenter logic for linked nodes must not change, and the canvas size and fit must follow the new rows.
- **Acceptance criteria**:
  - The REQ-UI-048 scenarios "No relations" and "Linked and unlinked" have passing tests naming the REQ.
  - The existing "Chain", "Diamond" and "Order inside a layer" tests still pass.
  - The four frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
```ts
// graph.ts
export type GraphNode = { /* existing fields */ group: "layer" | "unlinked" };
// layout(): nodes with no edge in `edges` (neither from nor to) get group "unlinked",
//   sorted by byImportance, layer = layers + Math.floor(i / 3), order = i % 3,
//   where layers = 1 + the highest layer of a linked node (0 when there is none).
// place(): unchanged formula; the group rows follow the last layer, so width and height already cover them.
export const UNLINKED_COLUMNS = 3;
```

Steps:
1. **`graph.test.ts`** (REQ-UI-048):
   - "No relations": 7 unlinked tasks get `group: "unlinked"` with layers 0,0,0,1,1,1,2 and orders 0,1,2,0,1,2,0, sorted by priority then id.
   - "Linked and unlinked": with `b` blocked by `a` and `c`–`f` unlinked:
     - `a` is at layer 0 and `b` at layer 1, both with group `layer`;
     - `c`, `d` and `e` are at layer 2 and `f` at layer 3, all with group `unlinked`.
   - The existing Chain, Diamond and Order tests keep passing. Their nodes all have edges.
   
   Run the tests and expect them to fail.
2. **Implement `layout()`:**
   - Compute `linkedIds` from `edges`.
   - Run the existing DFS layering and barycenter sort over the linked ids only.
   - Append the unlinked ids, sorted with `byImportance`, at `layer = linkedLayers + Math.floor(i / UNLINKED_COLUMNS)` and `order = i % UNLINKED_COLUMNS`.
   - `place()` needs no formula change. Check that its width and height cover the group.
3. **`GraphCanvas.test.tsx`** (REQ-UI-048):
   - With unlinked nodes, a heading "n without dependencies" appears above the first unlinked row, at the `y` of that row minus the heading height.
   - With none, there is no heading.
   - The heading uses the count of nodes in the group.
   
   Implement it as an absolutely positioned `<p>` inside the scaled canvas. Add half of `NODE.gapY` above the group if the heading overlaps the arrows of the last layer.
4. Run the four frontend checks and expect all to pass. Commit: `git commit -m "feat(beads): unlinked graph nodes in rows of 3 below the layers (gin-console-21h)"`

### Track 3: Milestones and Reports
- **Dependencies**: Track 1 (`shortId`)
- **Requirements**: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-013, REQ-REPORTS-012, REQ-UI-107
- **Files**:
  - Modify `backend/src/gin_console/milestones/models.py:26-27`: `MilestoneEntry.start` and `.end` become `IsoDate | None`.
  - Test `backend/tests/test_milestones_api.py`: an entry without dates.
  - Modify `frontend/src/features/milestones/api.ts:9-10` and `:48-49`: `start` and `end` become `string | null`, with the shape check updated.
  - Modify `frontend/src/features/milestones/MilestonesPage.tsx:123-137`:
    - "No dates" when `start` or `end` is null;
    - the name link gets `title`;
    - any sort that uses `start` puts null last.
  - Modify `frontend/src/features/milestones/GanttChart.tsx:397-412`:
    - the meta container becomes `flex flex-wrap lg:flex-nowrap`;
    - the spans are `shrink-0` with `title` below lg;
    - the id label uses `shortId`.
  - Modify `frontend/src/features/reports/team/TeamSection.tsx:13,45-82`: `selectClass` and labels get `max-w-full min-w-0`.
  - Modify `frontend/src/features/reports/ReportsPage.tsx:~137-146`: the Project select gets the same classes.
  - Modify `frontend/src/features/reports/BarRows.tsx:18`: `title={row.key}`.
  - Test `MilestonesPage.test.tsx`, `api.test.ts` (milestones), `GanttChart.test.tsx`, `ReportsPage.test.tsx` and the reports `sections.test.tsx` or a BarRows test.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** one small backend type change plus bounded display fixes in two features, each with a written scenario.
- **Acceptance criteria**:
  - Every new scenario of REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-013 and REQ-REPORTS-012 has a passing test naming its REQ.
  - pytest, ruff, mypy and the four frontend checks pass.
- **Estimated complexity**: medium

Interfaces consumed: `shortId` from Track 1.

Steps:
1. **pytest** (REQ-MILESTONE-UI-008, "entry without dates"):
   - The fake `gin milestone list` prints M1 and M4 with `start: null`, `end: null` and `error: "M4 has no start/end metadata"`, following the existing fixtures in `test_milestones_api.py:~262`.
   - `GET /api/milestones?project=P` gives 200 with M4's nulls and error.
   
   Run `uv run --directory backend pytest tests/test_milestones_api.py` and expect a failure (a 502). Change `models.py`, then run it again and expect a pass. Run `ruff check .` and `mypy`.
2. **`MilestonesPage.test.tsx`** (REQ-MILESTONE-UI-001, "milestone without dates"):
   - M1 is shown normally.
   - M4 shows "No dates" and its error.
   - A 120-character title has `title`.
   
   Update `api.ts` types and the shape check, then `MilestonesPage.tsx`.
3. **`GanttChart.test.tsx`** (REQ-MILESTONE-UI-013, "long id"):
   - The meta container has `flex-wrap` and `lg:flex-nowrap`.
   - The period, closed and prep spans have `title`.
   - A long epic id shows `shortId` with `title`.
   
   Implement.
4. **`ReportsPage.test.tsx`** (REQ-REPORTS-012, "long options on a phone"): the Team tab's Milestone and Member selects have `max-w-full`. Implement in `TeamSection.tsx` and `ReportsPage.tsx`.
5. **BarRows** (REQ-UI-107, "Cut text has a tooltip"): each row key has `title`. Implement.
6. Run the backend checks (`uv run --directory backend pytest`, `ruff check .`, `mypy`) and the four frontend checks. Commit: `git commit -m "fix(milestones,reports): undated milestones, Gantt labels and selects on a phone (gin-console-21h)"`

### Track 4: QA cases
- **Dependencies**: none
- **Requirements**: REQ-UI-107, REQ-UI-044, REQ-UI-048, REQ-UI-049, REQ-UI-065, REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-013, REQ-REPORTS-012
- **Files**: cases under `qa/cases/{ui,milestone-ui,reports}/`, new ones and updated ones re-pinned. The stale cases include TC-UI-055 through TC-UI-066 and the cases of the other MODIFIED REQs.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** case writing per scenario with the gin-qa CLI.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-21h` prints `ok`.
  - `gin-qa cases check` shows no new finding.
- **Estimated complexity**: low

Steps:
1. Run `gin-qa cases plan --change gin-console-21h --format json`.
2. Add one case per missing scenario: `api` for REQ-MILESTONE-UI-008 and `e2e` for the rest. Each case stands alone, has one action per step, and states Expected exactly as the scenario does.
3. Update and pin the stale cases. Change a case's text only where the REQ change touches what it asserts:
   - "No relations" now expects rows of 3;
   - "long id" on the Gantt now expects wrapping lines.
4. Repeat the check until it prints `ok`. Commit: `git commit -m "test(qa): cases for long text, graph grouping and undated milestones (gin-console-21h)"`

### Track 5: Long-text sweep on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3, Track 4
- **Requirements**: REQ-UI-107, REQ-UI-044, REQ-UI-048, REQ-UI-049, REQ-UI-065, REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-013, REQ-REPORTS-012
- **Files**: modify `docs/changes/gin-console-21h-ui-polish/05-tests.md` (TC-1 result).
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** deploy with the recorded commands and run the existing sweep script. The user delegated manual validation to Playwright on 2026-11-15.
- **Acceptance criteria**: TC-1 is recorded as `pass, claude (Playwright sweep on the deployed build of <commit>, <pages> pages × 2 sizes, 0 findings, screenshots in qa/evidence/<date>-21h-tc1)`.
- **Estimated complexity**: low

Steps:
1. Deploy from the main checkout on `feat/gin-console-21h-ui-polish`:
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - `curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/projects`, which should print `200`
   
   Report the rollback command.
2. Rebuild the example project with `python3 scripts/make_example_project.py`. Run the sweep `qa/evidence/2026-11-15-long-text-2` (the `sweep2.js` variant with the Graph view URLs, copied into the new evidence folder) at 1440×900 and 390×844. Every page should report `overflow=0 offscreen=0 clipped=0 squeezed=0`, and no `truncated` item should have `title=no`. Check every remaining finding against its screenshot before blaming the app. A `truncated` item with a title is allowed.
3. Undated milestone: make a temporary copy of the example project with `--out /tmp/example-undated`. Add a milestone bead without `start`/`end` metadata with `bd -C /tmp/example-undated create … -t milestone`, outside any repository. Point a temporary config (`GIN_CONSOLE_CONFIG`) at it, run a second console on another port, and check that `/milestones?project=…` shows "No dates" and the error. Stop that console afterwards.
4. Record TC-1 in `05-tests.md`. Commit: `git commit -m "test(specs): TC-1 long-text sweep passed (gin-console-21h)"`

## Integration
- **Branch**: `feat/gin-console-21h-ui-polish`
- **Merge strategy**: parallel-then-merge. Tracks 1, 2 and 4 merge in any order, Track 3 after Track 1, and Track 5 checks the merged branch.

## Validation
- [ ] Backend pytest, ruff and mypy pass
- [ ] Frontend test, typecheck, lint and build pass
- [ ] `gin specs lint --change gin-console-21h --against master` prints `ok`, and `gin specs trace --change gin-console-21h` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-21h` prints `ok`
- [ ] TC-1 passes on the deployed console

## Notes
- The Parent Bead `gin-console-21h` stays open until the user confirms the merge. Track beads close after their tests and review pass.
- Following the user's solo-work rule, the spec and this plan go in one commit at plan approval. Ship merges locally and then pushes `master`.
