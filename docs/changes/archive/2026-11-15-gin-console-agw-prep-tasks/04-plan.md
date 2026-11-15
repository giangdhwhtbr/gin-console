# Plan: Show prep tasks apart from tracks

Epic: gin-console-agw
Spec: `01-proposal.md`, `02-spec-delta.md`, `03-design.md` in this folder.

## Objective
Prep tasks are beads with the label `prep` and no `track:` or `req:` label. They are shown apart from tracks:
- Child progress counts tracks only, with "Prep x/y" next to it and a "Prep" chip on prep rows. This applies to the List view, the bead page, the Dependencies page (nodes and heading bar), the Gantt and the Reports top epics.
- Project counts leave prep out and add `prep`.
- The Team tab leaves prep out of its scope.

Usage accounting is unchanged.

Every scenario of the 11 MODIFIED REQs has a test naming its REQ. `gin-qa cases check --change gin-console-agw` prints `ok`. TC-1 passes on the Tailscale deploy.

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
- **Problem statement:** gin-workflow now creates prep tasks under epics (gin-workflow-y4o8). gin-console counts them as ordinary children, which mixes pre-discuss work into progress bars, project counts, reports and the Team KPIs.
- **Success criteria:**
  - Everything in the Objective.
  - `uv run --directory backend pytest`, `ruff check .`, `mypy`, `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
  - `gin specs lint --change gin-console-agw --against master` prints `ok`, and `gin specs trace --change gin-console-agw` lists no missing REQ.
- **Global constraints** (from the spec):
  - A bead is a prep task when its `labels` hold `prep` and no label starts with `track:` or `req:`. This mirrors gin-workflow `workflow_core/prep.py` `is_prep`.
  - The rule is kept in one backend helper (`beads/prep.py`) and one frontend helper (`features/beads/prep.ts`).
  - A track is any other child.
  - Usage (tokens and cost) is unchanged: prep tasks still count toward the epic's own share.
  - `BeadDetail.children` gets its own child model with `prep`. `dependencies`, `dependents` and `bugs` keep their shape.
  - An epic whose only children are prep tasks shows no track count, only "Prep x/y". On the Dependencies page it keeps its open icon.
  - Board, Focus, My Tasks, and the Milestones list progress (from gin-workflow) are unchanged.
  - Read-only, no new dependency, and the Windows and macOS paths are untouched.
  - New and changed tests carry their REQ-ID.
- **Non-goals:**
  - A prep view or filter.
  - Editing prep tasks.

## Approach Options
### Option 1: backend flags and counts, plus a frontend helper over `labels`
- **Summary:**
  - The backend adds `prep` where only it knows the bead: detail children, project counts, report epic counts and the Team scope.
  - The frontend uses `isPrep(labels)` where it already has the bead list: tree, graph and Gantt.
- **Pros:**
  - Each place uses the data it already has.
  - No new endpoint.
- **Cons:** two copies of a one-line rule (Python and TypeScript), each tested.

### Option 2: backend sends a `prep` flag on every `BeadSummary`
- **Pros:** one rule.
- **Cons:**
  - Changes REQ-BEADS-001 and the ETag body of every bead list.
  - It is still a mirror of gin-workflow's rule.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** it is the design confirmed on 2026-11-13 (`03-design.md`).

## Scope
- **In scope:**
  - Backend:
    - `backend/src/gin_console/beads/{prep.py (new),models.py,source.py}`;
    - `projects/{models.py,source.py}`;
    - `reports/{models.py,service.py,team.py}`;
    - tests.
  - Frontend:
    - `frontend/src/features/beads/{prep.ts (new),api.ts,tree.ts,ListRow.tsx,BeadDetailPage.tsx,graph.ts,GraphNode.tsx,GraphPage.tsx}`;
    - `milestones/{gantt.ts,GanttChart.tsx}`;
    - `reports/{api.ts,UsageSection.tsx}`;
    - `projects/{api.ts,ProjectCard.tsx}`;
    - tests.
  - QA: `qa/cases/`.
  - `05-tests.md`.
- **Out of scope:**
  - Board and Focus;
  - My Tasks;
  - the Milestones list;
  - gin-workflow.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend), Track 2 (Beads frontend) and Track 4 (QA cases) share no file and run together, Track 2 building against the JSON in Track 1's Interfaces with fixtures; Track 3 (Gantt, Reports, Projects card) reuses Track 2's prep.ts and waits for it; Track 5 is the human check after all merge.
```

## Tasks

### Track 1: Backend prep rule, counts, detail children and reports
- **Dependencies**: none
- **Requirements**: REQ-BEADS-002, REQ-SERVER-006, REQ-REPORTS-003, REQ-REPORTS-009
- **Files**:
  - Create `backend/src/gin_console/beads/prep.py`
  - Modify `backend/src/gin_console/beads/models.py:37-64` (`ChildRelation` with `prep`; `BeadDetail.children: list[ChildRelation]`)
  - Modify `backend/src/gin_console/beads/source.py:~200-215` (children built with `prep`)
  - Modify `backend/src/gin_console/projects/models.py:19-25` (`Beads.prep: int = 0`)
  - Modify `backend/src/gin_console/projects/source.py:17-35` (`count_beads` leaves prep out of `open`, `in_progress`, `blocked` and `ready`, and counts `prep`)
  - Modify `backend/src/gin_console/reports/models.py:~110-115` (`EpicUsage.prep_children`, `closed_prep_children`)
  - Modify `backend/src/gin_console/reports/service.py:~262-283` (epic rows count tracks and prep apart)
  - Modify `backend/src/gin_console/reports/team.py:78-92` (`_scope`: skip prep beads; "has a child" means "has a track child")
  - Test `backend/tests/test_beads_prep.py` (new), plus the existing `test_beads_api.py`, `test_collect.py`, `test_project_beads.py`, `test_reports_service.py` and `test_reports_team.py` where a new scenario fits beside its REQ
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded edits in four backend modules sharing one helper, each with a written scenario. Care is needed so `blocked`, `ready` and the active epics stay right.
- **Acceptance criteria**:
  - Every scenario of REQ-BEADS-002, REQ-SERVER-006, REQ-REPORTS-003 and REQ-REPORTS-009 (new and existing) has a passing test naming its REQ.
  - Usage totals are unchanged.
  - The backend suite, `ruff` and `mypy` pass.
- **Estimated complexity**: medium

Interfaces produced:
```python
# beads/prep.py
def is_prep(labels: Iterable[str]) -> bool:
    """gin-workflow workflow_core/prep.py is_prep: label `prep` and no `track:` or `req:` label."""
    found = list(labels)
    return "prep" in found and not any(l.startswith(("track:", "req:")) for l in found)

# beads/models.py
class ChildRelation(BaseModel):
    model_config = ConfigDict(strict=True)
    id: Text
    title: Text
    status: Text
    type: Literal["parent-child"]
    prep: bool = False
# BeadDetail.children: list[ChildRelation] = []

# projects/models.py: Beads.prep: int = 0   (prep tasks not closed)
# reports/models.py: EpicUsage.prep_children: int = 0; EpicUsage.closed_prep_children: int = 0
```
JSON produced:
- detail `children[]` gains `"prep": bool`;
- `beads` (project summary) gains `"prep": int`;
- report `usage.epics[]` gains `"prep_children"` and `"closed_prep_children"`.

Steps:

1. Tests first, one per new scenario of the four REQs in `02-spec-delta.md`. Use `e-1` with tracks `t-1` and `t-2` and prep task `p-1` (`labels=["prep","prep:mockup"]`), plus a child with `["prep","track:api"]` that counts as a track. Read `labels` from the export rows (`fake_export.bead(..., labels=[...])`), and set parents through `dependencies` with `dep(child, parent, "parent-child")`; for reports rows use `parent=`, as in `test_reports_service.py`. Each test gets a `# REQ-…` comment. Also unit-test `is_prep`.
2. Run the new tests; expect them to fail.
3. Implement `prep.py`, then the four modules:
   - `count_beads` filters prep out of `active`, `ready` and `blocked`, and `prep = count of prep beads not closed`. The active `epics` list is unchanged.
   - Detail children set `prep` from the child row's `labels`.
   - The report epic row splits `kids` with `is_prep`.
   - `_scope` uses `labels` on `ReportBead`: skip a bead with `is_prep`, and skip an epic when any child is not prep.
4. Run `uv run --directory backend pytest`, `ruff check .` and `mypy`; expect all to pass.
5. Commit: `git commit -m "feat(beads): prep tasks apart from tracks in counts, detail and reports (gin-console-agw)"`

### Track 2: Prep apart in the Beads views
- **Dependencies**: none (builds on Track 1's JSON with fixtures)
- **Requirements**: REQ-UI-028, REQ-UI-044, REQ-UI-049, REQ-UI-075
- **Files**:
  - Create `frontend/src/features/beads/prep.ts`
  - Create `frontend/src/features/beads/PrepChip.tsx`
  - Modify `frontend/src/features/beads/api.ts` (detail `children[].prep: boolean`, shape check)
  - Modify `frontend/src/features/beads/tree.ts:~120-135` (track and prep counts per node)
  - Modify `frontend/src/features/beads/ListRow.tsx:~65-85` (track bar, "Prep x/y", "Prep" chip)
  - Modify `frontend/src/features/beads/BeadDetailPage.tsx:~75-185` (track bar, "Prep x/y", chip on prep children)
  - Modify `frontend/src/features/beads/graph.ts:~55-70` (`progressOf` over tracks; open icon from `hasChildren`)
  - Modify `frontend/src/features/beads/GraphNode.tsx`, `GraphPage.tsx` (node "n of m done" only with a track; "Prep" chip; heading bar over non-prep nodes)
  - Modify `frontend/src/features/beads/beadFixtures.ts` (children `prep`)
  - Test `prep.test.ts` (new), plus the existing `ListView.test.tsx`, `BeadDetailPage.test.tsx`, `GraphPage.test.tsx` and `GraphCanvas.test.tsx`, or a node test
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** several small view changes over one helper, with written scenarios. The tree and graph counts each need care.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-028, REQ-UI-044, REQ-UI-049 and REQ-UI-075 has a passing test naming its REQ.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: medium

Interfaces produced (Track 3 consumes them):
```ts
// features/beads/prep.ts
export function isPrep(labels: readonly string[]): boolean; // "prep" present and no label starting with "track:" or "req:"
export type ChildCounts = { tracks: number; closedTracks: number; prep: number; closedPrep: number };
export function childCounts(children: readonly { labels: readonly string[]; status: string }[]): ChildCounts;
export const prepLabel: (c: ChildCounts) => string | null; // "Prep x/y" when prep > 0, else null

// features/beads/PrepChip.tsx (one component per file)
export function PrepChip(): JSX.Element; // <Badge variant="outline">Prep</Badge>
```

Steps:
1. Test and implement `prep.ts` (`isPrep`, `childCounts`, `prepLabel`) and `PrepChip.tsx`.
2. For each view, write the new REQ scenario test first (fixtures with `t-1`, `t-2` and `p-1`), then change the view:
   - **List (REQ-UI-044):** a track bar "N/M" only when there is a track, "Prep x/y" when there are prep tasks, and a chip on the prep row.
   - **Bead page (REQ-UI-028):** the same, using `children[].prep`.
   - **Dependencies node (REQ-UI-049):** the open icon on any node with children, "n of m done" over tracks only when there is a track, and a chip on a prep node.
   - **Heading bar (REQ-UI-075):** counts only non-prep nodes.
3. Run the four frontend checks and expect them to pass. Commit: `git commit -m "feat(beads): show prep tasks apart from tracks in List, bead page and Dependencies (gin-console-agw)"`

### Track 3: Prep apart on the Gantt, Reports and project card
- **Dependencies**: Track 2
- **Requirements**: REQ-MILESTONE-UI-015, REQ-UI-089, REQ-UI-004
- **Files**:
  - Modify `frontend/src/features/milestones/gantt.ts:~150-225` (`childrenOf`, row counts) and `GanttChart.tsx:~400` ("N/M closed" over tracks, "Prep x/y", chip on prep child rows)
  - Modify `frontend/src/features/reports/api.ts:~22-33` (`EpicUsage.prep_children`, `closed_prep_children`) and `UsageSection.tsx:~95-100` ("Prep x/y")
  - Modify `frontend/src/features/projects/api.ts` (`Beads.prep`) and `ProjectCard.tsx:~20-35` ("prep <n>" when above 0)
  - Test `gantt.test.ts`, `GanttChart.test.tsx`, `sections.test.tsx` (AI usage), `ProjectCard` / `ProjectsPage.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** three small display changes that reuse Track 2's helpers and Track 1's JSON fields.
- **Acceptance criteria**:
  - Every scenario of REQ-MILESTONE-UI-015, REQ-UI-089 and REQ-UI-004 has a passing test naming its REQ.
  - The four frontend checks pass.
- **Estimated complexity**: low

Steps:
1. Test first per new scenario, then implement:
   - **Gantt:** uses `childCounts`, `prepLabel` and `PrepChip` from `features/beads`.
   - **Reports and card:** read the new JSON fields. Treat a missing field as 0 in the shape check, for an older backend.
2. Run the four frontend checks. Commit: `git commit -m "feat(ui): prep tasks apart on the Gantt, Reports and project card (gin-console-agw)"`

### Track 4: QA cases
- **Dependencies**: none
- **Requirements**: REQ-BEADS-002, REQ-SERVER-006, REQ-REPORTS-003, REQ-REPORTS-009, REQ-UI-004, REQ-UI-028, REQ-UI-044, REQ-UI-049, REQ-UI-075, REQ-UI-089, REQ-MILESTONE-UI-015
- **Files**:
  - Modify or create cases under `qa/cases/{beads,server,reports,ui,milestone-ui}/` for the new scenarios, and re-pin the cases of the MODIFIED REQs
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** case writing per scenario with the gin-qa CLI.
- **Acceptance criteria**: `gin-qa cases check --change gin-console-agw` prints `ok`, with no new finding in `gin-qa cases check`.
- **Estimated complexity**: low

Steps:
1. Run `gin-qa cases plan --change gin-console-agw --format json`.
2. Add one case per missing scenario: `api` for REQ-BEADS, REQ-SERVER and REQ-REPORTS, and `e2e` for REQ-UI and REQ-MILESTONE-UI. Each case stands alone, has one action per step, and states Expected exactly as the scenario does.
3. Update and pin the stale cases.
4. Repeat the check until `ok`, then commit: `git commit -m "test(qa): cases for prep tasks apart from tracks (gin-console-agw)"`

### Track 5: Check on the Tailscale deploy
- **Dependencies**: Track 1, Track 2, Track 3, Track 4
- **Requirements**: REQ-SERVER-006, REQ-UI-004, REQ-UI-028, REQ-UI-044, REQ-UI-049, REQ-UI-075, REQ-MILESTONE-UI-015
- **Files**:
  - Modify `docs/changes/gin-console-agw-prep-tasks/05-tests.md` (TC-1 result)
- **Provider role**: `general`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** deploy with the recorded commands and record the user's result.
- **Human gate**: the user walks TC-1 on `https://instance-20260515-2304.tail5ca54e.ts.net:8443` and reports pass or fail. A project needs an epic with a prep task; if none exists, the user creates one in a project (for example with `gin-workflow` prep commands) before the check.
- **Acceptance criteria**: TC-1 is recorded as `pass, giangdhwhtbr, <date> (Tailscale build of <commit>)`.
- **Estimated complexity**: low

Steps:
1. Deploy from the main checkout on `feat/gin-console-agw-prep-tasks`:
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - the health check
   - Report the rollback command.
2. Find an epic with a prep task (`bd -C <project> list --label prep --all --json`) and ask the user to walk TC-1. Record the result.

## Integration
- **Branch**: `feat/gin-console-agw-prep-tasks`
- **Merge strategy**: parallel-then-merge. Tracks 1, 2 and 4 merge in any order, Track 3 after Track 2, and Track 5 deploys the merged branch.

## Validation
- [ ] Backend pytest, ruff and mypy pass
- [ ] Frontend test, typecheck, lint and build pass
- [ ] `gin specs lint --change gin-console-agw --against master` prints `ok`, and `gin specs trace --change gin-console-agw` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-agw` prints `ok`
- [ ] TC-1 passes on the Tailscale deploy

## Notes
- The Parent Bead `gin-console-agw` stays open until the user confirms the merge. Track beads close after their tests and review pass.
- Per the user's solo-work rule, the spec and this plan go in one commit at plan approval. Ship merges locally and then pushes `master`.
