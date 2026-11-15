# Plan: Milestone beads views

Epic: gin-console-8i7
Spec: `01-proposal.md`, `02-spec-delta.md`, `03-design.md` in this folder.

## Objective
The milestone page has two tabs, Gantt and Beads. The Beads tab embeds the Beads views with the milestone fixed. The Beads views gain a Graph view on the Beads page and on the milestone page. It shares the loaded beads, search and filters with List, Board and Focus, and has its own "Only linked" switch, details panel and drill-down. The bead page's breadcrumb returns to the milestone page when the bead was opened there. The "Dependencies" link next to the project picker goes away; the Dependencies page stays.

Every scenario of the 2 ADDED and 6 MODIFIED REQs has a test naming its REQ. `gin-qa cases check --change gin-console-8i7` prints `ok`. TC-1 passes on the deployed console, checked by Playwright.

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
- **Problem statement:** a milestone's beads can be read in the List, Board or Focus view only from the Beads page. The milestone page's Graph tab draws epics only, without filters or a details panel. The bead page returns to the Beads page, not to the milestone.
- **Success criteria:**
  - Everything in the Objective.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass. The backend is unchanged.
  - `gin specs lint --change gin-console-8i7 --against master` prints `ok`, and `gin specs trace --change gin-console-8i7` lists no missing REQ.
- **Global constraints** (from the spec):
  - Frontend only. No API change and no new dependency.
  - Read-only.
  - The Gantt tab, the Dependencies page (`/beads/<p>/graph`, `/beads/<p>/<id>/graph`) and the "View dependencies" button are unchanged.
  - The Graph view reuses `scopeGraph`, `GraphCanvas` and the embedded `BeadDetailPage`. It draws the direct children of its scope, chosen in this order:
    1. `scope` when it names a loaded bead with children.
    2. Else the milestone in effect when it is a milestone id.
    3. Else the project.
  - A node is drawn when its bead or a descendant matches the search, the filters and "Show closed".
  - The milestone page keeps the Beads views' params with the Beads page's names. Changing tab keeps only `start` and `zoom`. `tab=graph` is read as `tab=beads&view=graph`.
  - The remembered place holds a path and a query. The Beads page and the milestone page's Beads tab both write it.
  - New and changed tests carry their REQ-ID.
- **Non-goals:**
  - Drawing every bead of a milestone on one canvas.
  - Long-text layout fixes and vertical layout of unlinked nodes (epic gin-console-21h).
  - A shared beads cache across tabs.

## Approach Options
### Option 1: Graph as a fourth view inside `BeadsView`, embedded by the milestone page
- **Summary:**
  - `BeadsView` chooses `GraphView` for `view=graph`, beside List, Board and Focus.
  - The milestone page renders `BeadsView` with `fixedMilestone`.
- **Pros:**
  - One load and one filter pipeline for four views.
  - The Beads page gets the Graph view for free.
  - `MilestoneGraph` is removed.
- **Cons:** `BeadsView` must load milestone beads (`keepMilestones`) for the milestone scope, and drop them from the other views itself.

### Option 2: keep `MilestoneGraph` and add a separate Beads tab
- **Pros:** no change to `BeadsView`'s view set.
- **Cons:**
  - Two graph components.
  - The graph ignores the filters.
  - It contradicts the design the user confirmed on 2026-11-15.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** it is the confirmed design (`03-design.md`).

## Scope
- **In scope:**
  - `frontend/src/features/beads/{filters.ts,graph.ts,GraphView.tsx (new),ViewTabs.tsx,BeadsView.tsx,BeadFilterBar.tsx,BeadsPage.tsx,returnState.ts,Breadcrumb.tsx}`;
  - `frontend/src/features/milestones/{MilestonePage.tsx,api.ts,MilestoneGraph.tsx (removed),milestoneFixtures.ts}`;
  - tests next to each file;
  - QA cases under `qa/cases/`;
  - `05-tests.md`.
- **Out of scope:**
  - backend;
  - Gantt;
  - the Dependencies page;
  - My Tasks;
  - Reports.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (Graph view in BeadsView) and Track 3 (QA cases) share no file and run together; Track 2 (milestone Beads tab and remembered place) edits BeadsView and BeadFilterBar after Track 1 and needs its Graph view for tab=graph; Track 4 checks the merged branch on the deploy.
```

## Tasks

### Track 1: Graph view in the Beads views
- **Dependencies**: none
- **Requirements**: REQ-UI-106, REQ-UI-030, REQ-UI-081, REQ-UI-104
- **Files**:
  - Modify `frontend/src/features/beads/filters.ts:4-75` (`VIEWS` adds `graph`; `BeadFilters.scope`; parse and write `scope`)
  - Modify `frontend/src/features/beads/graph.ts:42` and `:239-267` (`GraphOptions.keep`; `kept` honours it) and add `keepWithAncestors`
  - Create `frontend/src/features/beads/GraphView.tsx`
  - Modify `frontend/src/features/beads/ViewTabs.tsx:4` (title "Graph")
  - Modify `frontend/src/features/beads/BeadsView.tsx:28-80` (load with `keepMilestones`, drop milestone beads from List/Board/Focus and the filter options, render `GraphView`)
  - Modify `frontend/src/features/beads/Breadcrumb.tsx:6` (`VIEW_NAME.graph = "Graph"`)
  - Modify `frontend/src/features/beads/BeadsPage.tsx:72-74` (remove the "Dependencies" link and its `graphPath` import)
  - Test `filters.test.ts`, `graph.test.ts`, `GraphView.test.tsx` (new), `BeadsPage.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded new view that reuses the existing graph functions and canvas, with written scenarios. The scope order, the folding of filtered descendants into nodes, and leaving milestone beads out of the other views need care.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-106, and the changed scenarios of REQ-UI-030, REQ-UI-081 and REQ-UI-104, has a passing test naming its REQ.
  - Existing List, Board, Focus and Dependencies page tests still pass.
  - The four frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced (Track 2 consumes them):
```ts
// filters.ts
export const VIEWS = ["list", "board", "focus", "graph"] as const;
// BeadFilters gains: scope: string;   // URL `scope`, "" when absent; written only when not ""
// an old `?view=graph&epic=e-1` parses to view "graph"; `epic` is not part of BeadFilters, so it is dropped

// graph.ts
export type GraphOptions = { hideDone: boolean; onlyLinked: boolean; keep?: ReadonlySet<string> };
// scopeGraph: a bead counts as kept only when keep is undefined or keep.has(id), in addition to hideDone
/** The ids of the beads, plus every loaded ancestor of each (through `parent`). */
export function keepWithAncestors(all: readonly BeadSummary[], matched: readonly BeadSummary[]): Set<string>;

// GraphView.tsx
export function GraphView(props: {
  project: string;
  beads: readonly BeadSummary[];        // every loaded bead, milestone beads included
  matched: readonly BeadSummary[];      // the beads that pass search, filters and Show closed (see milestone rule below)
  milestone: MilestoneInEffect;         // "all", "none" or a milestone id
  filters: BeadFilters;
  onChange: (next: BeadFilters) => void;
}): JSX.Element;
```

Steps:

1. **Tests for `filters.ts`** (REQ-UI-030, REQ-UI-106):
   - `parseFilters("?view=graph")` gives view `graph`.
   - `parseFilters("?project=a&view=graph&epic=e-1")` gives view `graph`, and `filtersToSearch` of it has no `epic`.
   - `scope` round-trips.
   - `view=tree` still gives `list`.
   
   Run `pnpm -C frontend test --run src/features/beads/filters.test.ts`; expect failures. Implement, then run again; expect a pass.
2. **Tests for `graph.ts`** (REQ-UI-106):
   - `keepWithAncestors` returns the matched ids and the ids of their ancestors.
   - `scopeGraph(beads, "m2", { hideDone: false, onlyLinked: false, keep })` drops a child of `m2` that is not in `keep`. It also keeps no arrow from a dropped bead.
   
   Implement `kept = b !== undefined && !(options.hideDone && isDone(b)) && (options.keep === undefined || options.keep.has(id))`.
3. **`GraphView.test.tsx`** (REQ-UI-106, REQ-UI-081): render `GraphView` with fixtures `m2` (milestone), `e1` (epic in `m2`, task `e1.1` assigned `bao`), `e2` (epic in `m2`, blocked by `x`), `x` (epic in `m3`). Cover:
   - **Milestone scope:** `e1` and `e2` drawn, `x` dashed with an arrow to `e2`.
   - **Project scope** with milestone `all`: top-level beads drawn, "Only linked" on.
   - **Filters apply to the nodes:** `matched` holds only `e1.1`, so `e1` is drawn and `e2` is not.
   - **Drill down and back:** opening `e1` calls `onChange` with `scope: "e1"`. With `scope: "e1"`, the breadcrumb shows `m2` › `e1`, and choosing `m2` calls `onChange` with `scope: ""`.
   - **Open a leaf:** opening `e1.1` navigates to `/beads/<p>/e1.1`.
   - **Details panel:** selecting `e1` calls `onChange` with `select: "e1"`. With `select: "e1"`, the aside "Bead details" renders the embedded bead (stub its fetch as `GraphPage.test.tsx` does).
   - **Nothing matches:** with `matched` empty, it says "No beads match these filters".
4. Implement `GraphView.tsx` from `GraphPage.tsx:16-140`, without its routing:
   - `const scopeId = filters.scope !== "" && hasChildren(beads, filters.scope) ? filters.scope : milestone !== "all" && milestone !== "none" ? milestone : null`.
   - `const onProject = scopeId === null`.
   - Graph beads: `onProject || scopeId !== milestone` use the beads without `issue_type === "milestone"` (REQ-MILESTONE-UI-006). The milestone scope uses all beads.
   - `const graph = scopeGraph(graphBeads, scopeId, { hideDone: false, onlyLinked, keep: keepWithAncestors(beads, matched) })`.
   - `onlyLinked` is React state, initialised to `onProject` and reset when the scope changes (`key` on the scope).
   - Show:
     - `n without dependencies`;
     - the cycle warning;
     - "Dashed nodes are outside this milestone." when the scope is a milestone;
     - "No beads match these filters" when `graph.nodes.length === 0`.
   - The breadcrumb `nav aria-label="Graph scope"` lists:
     1. the milestone id, or the project name on the project scope;
     2. `ancestorsOf(beads, scopeId)` below the top;
     3. the scope.
     
     Each item is a button calling `onChange({ ...filters, scope: <id or ""> })`. The top item sets `scope: ""`.
   - `onSelect(id)`: `onChange({ ...filters, select: id })`.
   - `onOpen(id)`: when `hasChildren(beads, id)`, `onChange({ ...filters, scope: id, select: "" })`; else `navigate(\`/beads/${enc(project)}/${enc(id)}\`)`.
   - The side panel is `<aside aria-label="Bead details">` with `BeadDetailPage embedded graphScope={scopeId}`, laid out as in `GraphPage.tsx:51` and `:132-138`.
5. **`BeadsView.tsx`:**
   - `useBeads(project, closed, true)`.
   - `const listBeads = beads.filter((b) => b.issue_type !== "milestone")`. Use `listBeads` for `optionsOf`, the count, `filterBeads`, Board, Focus and List.
   - For Graph: `matched = filterBeads(listBeads, { ...filters, closed: filters.closed || closedMilestone }, scopeIsProject ? milestone : "all")`, where `scopeIsProject` is `milestone === "all" || milestone === "none"`. Outside beads must not be filtered out by the milestone, so the milestone criterion applies only on the project scope. Render `<GraphView project beads={beads} matched={matched} milestone={milestone} filters onChange />` when `filters.view === "graph"`.
   - `ViewTabs` shows "Graph".
6. **`BeadsPage.tsx`:** remove the "Dependencies" link. In `BeadsPage.test.tsx`, replace the "Entry" test with "No separate entry" (REQ-UI-081): there is no link "Dependencies", and the View nav has "Graph". Add a test for the Graph view on the Beads page with `milestone=m2&view=graph` (REQ-UI-104, REQ-UI-106). Add `/api/beads/milestones` to that test's fetch stub when missing.
7. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint` and `pnpm -C frontend build`; expect all to pass. Commit: `git commit -m "feat(beads): Graph view in the Beads views (gin-console-8i7)"`

### Track 2: Beads tab on the milestone page and the remembered place
- **Dependencies**: Track 1
- **Requirements**: REQ-MILESTONE-UI-018, REQ-MILESTONE-UI-002, REQ-UI-072, REQ-UI-073
- **Files**:
  - Modify `frontend/src/features/beads/BeadsView.tsx` (prop `fixedMilestone?: string`)
  - Modify `frontend/src/features/beads/BeadFilterBar.tsx:~15-25` and `:113` (prop `hideMilestone?: boolean`), passed on to `MobileFiltersSheet.tsx:238`
  - Modify `frontend/src/features/milestones/api.ts:178-185` (`milestonePath`)
  - Modify `frontend/src/features/milestones/MilestonePage.tsx:12-75` (tabs, Beads panel, `tab=graph` redirect, remembered place)
  - Delete `frontend/src/features/milestones/MilestoneGraph.tsx`
  - Modify `frontend/src/features/milestones/milestoneFixtures.ts:74-85` (route `/api/beads/milestones`)
  - Modify `frontend/src/features/beads/returnState.ts` (`Saved.path`, `rememberPlace`)
  - Modify `frontend/src/features/beads/BeadsPage.tsx:41` (`rememberPlace("/beads", …)`)
  - Modify `frontend/src/features/beads/Breadcrumb.tsx:35-46` (milestone label and link)
  - Test `MilestonePage.test.tsx`, `api.test.ts` (milestones), `returnState` tests, `Breadcrumb` / `BeadDetailPage.test.tsx`, `ReturnFlow.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded wiring of an existing view into the milestone page plus one storage-shape change, with written scenarios. The URL merging and the backward-compatible parse of the stored place need care.
- **Acceptance criteria**:
  - Every scenario of REQ-MILESTONE-UI-018, REQ-MILESTONE-UI-002 and the added scenarios of REQ-UI-072 and REQ-UI-073 has a passing test naming its REQ.
  - Existing breadcrumb and return-flow tests still pass.
  - The four frontend checks pass.
- **Estimated complexity**: medium

Interfaces consumed: Track 1's `VIEWS`, `BeadFilters.scope` and `GraphView` (through `BeadsView`).

Interfaces produced:
```ts
// milestones/api.ts
export type MilestoneTab = "gantt" | "beads";
export function milestonePath(project: string, id: string, tab: MilestoneTab = "gantt", start: string | null = null, zoom: Zoom = "all", extra = ""): string;
// extra: a query from filtersToSearch (with or without "?"), merged after tab/start/zoom; `project` and `milestone` in it are dropped

// BeadsView: fixedMilestone?: string  -> milestone in effect = fixedMilestone; BeadFilterBar hideMilestone
// returnState.ts
export type Saved = { path: string; search: string; open: Record<string, string[]> }; // path "/beads" when missing in old data
export function rememberPlace(path: string, search: string): void; // rememberSearch(search) stays as rememberPlace("/beads", search)
```

Steps:

1. **`milestones/api.test.ts`:**
   - `milestonePath("p","m2","beads",null,"all","?view=board&status=open")` is `/milestones/p/m2?tab=beads&view=board&status=open`.
   - `milestonePath("p","m2","gantt","2026-11-10","2w")` is `/milestones/p/m2?start=2026-11-10&zoom=2w`.
   - `extra` drops `project` and `milestone`.
   
   Implement.
2. **`MilestonePage.test.tsx`** (REQ-MILESTONE-UI-018, REQ-MILESTONE-UI-002), with `stubMilestones` serving `/api/beads/milestones` (`{ milestones: [m1 closed, m2 active, m3 planned], current: "m2" }`):
   - **Beads tab:** `?tab=beads` lists `e1` and `e2`, not `x`, and has no "Milestone" select.
   - **View and filters in the URL:** choose Board and status open, and the URL becomes `?tab=beads&view=board&status=open`.
   - **Changing tab:** from `?tab=beads&view=board&status=open&start=2026-11-10&zoom=2w`, choose Gantt and the URL is `?start=2026-11-10&zoom=2w`. Choose Beads and it is `?tab=beads&start=2026-11-10&zoom=2w`.
   - **Old Graph link:** `?tab=graph` is replaced by `?tab=beads&view=graph`, and the graph of `m2` shows with `x` dashed. This replaces the old Graph tab tests at `MilestonePage.test.tsx:176-193`.
   - **Closed milestone:** `m1` with "Show closed" off fetches `/api/beads?…closed=1` and shows its closed beads.
3. **Implement:**
   - `BeadFilterBar`: `hideMilestone` skips `<MilestoneFilter>` at `BeadFilterBar.tsx:113`, and passes it to `MobileFiltersSheet`, which skips its own at `:238`.
   - `BeadsView`: `fixedMilestone` sets `milestone = fixedMilestone` instead of `milestoneInEffect(...)` and passes `hideMilestone`.
   - `MilestonePage`:
     - `TABS` becomes Gantt and Beads.
     - `const asked = params.get("tab")`. When `asked === "graph"`, `navigate(milestonePath(project, id, "beads", start, zoom, "?view=graph"), { replace: true })` in an effect.
     - `tab = asked === "beads" || asked === "graph" ? "beads" : "gantt"`.
     - The Beads panel renders `<BeadsView project={project} fixedMilestone={id} filters={{ ...parseFilters(search), project, milestone: id }} onChange={(next) => navigate(milestonePath(project, id, "beads", start, zoom, filtersToSearch(next)), { replace: true })} />`.
     - Tab changes call `milestonePath(project, id, next, start, zoom)` without `extra`, so the Beads params drop.
     - Remove the `MilestoneGraph` import and file.
4. **Tests for `returnState`, `Breadcrumb` and `ReturnFlow`** (REQ-UI-072, REQ-UI-073):
   - Stored data without `path` reads as `/beads`.
   - **From a milestone page:** with `rememberPlace("/milestones/a/m2", "?tab=beads&view=board&status=open")`, the bead page of `a-1` shows "m2 › Board · 1 filter", linking to `/milestones/a/m2?tab=beads&view=board&status=open`.
   - **Milestone page last:** a later `rememberPlace("/beads", …)` replaces the milestone place, and the reverse also holds.
   - **Other project:** a milestone place of project `a` does not apply to a bead of project `b`.
5. **Implement:**
   - `returnState`: `Saved.path`, with `parse` defaulting `path` to `/beads`, `rememberPlace(path, search)`, and `rememberSearch` delegating to it.
   - `BeadsPage` calls `rememberPlace("/beads", …)`.
   - `MilestonePage`'s Beads tab calls `rememberPlace(\`/milestones/${enc(project)}/${enc(id)}\`, <current search>)` in an effect while the Beads tab is shown.
   - `Breadcrumb`:
     - When `saved.path` starts with `/milestones/`, take the project and milestone id from its segments and parse the filters from `saved.search`.
     - `remembered` is true when that project equals `project`.
     - The label is `${milestoneId} › ${view}${count}`, and the link is `saved.path + saved.search`.
     - Otherwise it behaves as today.
6. Run the four frontend checks; expect all to pass. Commit: `git commit -m "feat(milestones): Beads tab with the Beads views on the milestone page (gin-console-8i7)"`

### Track 3: QA cases
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-018, REQ-MILESTONE-UI-002, REQ-UI-106, REQ-UI-030, REQ-UI-072, REQ-UI-073, REQ-UI-081, REQ-UI-104
- **Files**:
  - Modify or create cases under `qa/cases/{ui,milestone-ui}/` for the new and changed scenarios
  - Update and re-pin the stale cases, starting with `TC-UI-041`, `TC-UI-042` and `TC-UI-043`
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** case writing per scenario with the gin-qa CLI.
- **Acceptance criteria**: `gin-qa cases check --change gin-console-8i7` prints `ok`, and `gin-qa cases check` shows no new finding.
- **Estimated complexity**: low

Steps:
1. Run `gin-qa cases plan --change gin-console-8i7 --format json`.
2. Add one `e2e` case per missing scenario. Each case stands alone, has one action per step, and states Expected exactly as the scenario does.
3. Update and pin the stale cases (`gin-qa cases pin <TC>`). Existing cases that assert the old Graph tab or the "Dependencies" link must now assert the new behaviour.
4. Repeat the check until it prints `ok`. Commit: `git commit -m "test(qa): cases for the milestone Beads tab and the Graph view (gin-console-8i7)"`

### Track 4: Check on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3
- **Requirements**: REQ-MILESTONE-UI-018, REQ-MILESTONE-UI-002, REQ-UI-106, REQ-UI-072, REQ-UI-073, REQ-UI-081
- **Files**:
  - Modify `docs/changes/gin-console-8i7-milestone-beads-views/05-tests.md` (TC-1 result)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** deploy with the recorded commands and walk TC-1 with a Playwright script. The user delegated manual validation to Playwright with screenshots on 2026-11-15.
- **Acceptance criteria**: TC-1 is recorded as `pass, claude (Playwright on the deployed build of <commit> with the example project, <n>/<n> checks, screenshots in qa/evidence/<date>-8i7-tc1)`.
- **Estimated complexity**: low

Steps:
1. Deploy from the main checkout on `feat/gin-console-8i7-milestone-beads-views`:
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - `curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/projects` (expect `200`)
   
   Report the rollback command.
2. Rebuild the example project (`python3 scripts/make_example_project.py`). Write a Playwright script modelled on `qa/evidence/2026-11-15-agw-tc1/agw-tc1.js`, with one check per TC-1 clause, each step in try/catch with a screenshot, at 1440×900 and 390×844, saved to `qa/evidence/<date>-8i7-tc1/`. Check each failure against its screenshot before blaming the app.
3. Record the result in `05-tests.md` and commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-8i7)"`

## Integration
- **Branch**: `feat/gin-console-8i7-milestone-beads-views`
- **Merge strategy**: parallel-then-merge. Tracks 1 and 3 merge in any order, Track 2 after Track 1, and Track 4 deploys the merged branch.

## Validation
- [ ] Frontend test, typecheck, lint and build pass
- [ ] `gin specs lint --change gin-console-8i7 --against master` prints `ok`, and `gin specs trace --change gin-console-8i7` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-8i7` prints `ok`
- [ ] TC-1 passes on the deployed console

## Notes
- The Parent Bead `gin-console-8i7` stays open until the user confirms the merge. Track beads close after their tests and review pass.
- Per the user's solo-work rule, the spec and this plan go in one commit at plan approval. Ship merges locally and then pushes `master`.
