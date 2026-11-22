# Plan: One set of definitions

Epic: gin-console-rm-definitions
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder.
- Diagrams: `docs/specs/beads/diagrams/bead-counts-activity.md`, `bead-state.md` and `me-filter-activity.md`; `docs/specs/milestone-ui/diagrams/milestone-state.md` and `milestone-status-activity.md`; `docs/specs/ui/diagrams/legend-tooltip-activity.md`.
- Use cases: `docs/specs/beads/use-cases/filter-my-beads.md` and `docs/specs/ui/use-cases/read-a-definition.md`.

## Objective
Blocked, done, progress, assignee, milestone status, late and dates mean one thing on every page, and every mark and count explains itself:
- **Blocked:** one rule (status `blocked`, or an open blocker of its own or of an ancestor) counts the same way on Projects, Board, Focus, the Team figures and the Gantt. A blocked bead is never counted as in progress.
- **Progress:** it comes from the new API field `child_counts`, so filters never change it.
- **Assignee:** the console shows the assignee or "Unassigned", never the owner. A handle and its email are one person, and the Assignee filter offers "Me".
- **Milestones:** a milestone bead shows its milestone status. Late has one rule.
- **Dates:** one format.
- **Explanations:** tooltips and a Legend explain marks and counts.
- **PM views:** they use plain words.

Done when:
- Every scenario of the 13 added and 19 modified REQs of `02-spec-delta.md` has a test that names its REQ.
- `gin-qa cases check --change gin-console-rm-definitions` prints `ok`.
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
  - **Blocked counts:** one scope shows 19, 17 and 0 blocked beads.
    - `projects/source.py:34` ignores status `blocked`.
    - `beads/source.py:168` adds it.
    - `columns.ts:34-41` puts a blocked in-progress bead in In Progress.
    - `reports/team.py:122` counts status `blocked` only.
    - `GanttChart.tsx:395` reads `epic.status` only.
  - **Progress:** three frontend counters (`graph.ts:74`, `epicOverview.ts:14`, `prep.ts:9`) count only the loaded beads.
  - **Assignee:** the owner stands in for a missing assignee (`ListRow.tsx:122`, `BeadCard.tsx:36`, `filters.ts:94`, `columns.ts:79`), and a handle and its email are two people.
  - **Milestone status:** a milestone bead shows its bead status, and late is computed three ways.
  - **Dates:** five formats.
  - **Explanations:** marks and counts carry no explanation, and PM views use gin-workflow jargon.
- **Success criteria:**
  - Everything in the Objective.
  - `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
  - `gin specs lint --change gin-console-rm-definitions --against master` prints `ok`, and `gin specs trace --change gin-console-rm-definitions` lists no missing REQ.
- **Global constraints** (from the spec and the user's decisions of 2026-11-21 and 2026-11-22):
  - **Blocked** (REQ-BEADS-007, REQ-BEADS-021):
    - The rule: not closed, and status `blocked` or in `snapshot.blocked`.
    - It counts whatever the status. In-progress counts leave blocked beads out.
    - Merge gates and milestones are left out. Prep tasks are counted apart.
  - **Placement:** Board and Focus place a bead in Done when closed, then Blocked, then Backlog, Ready or In Progress. A deferred bead with an open blocker is Blocked.
  - **Progress fields:** `child_counts = {total, closed, prep_total, prep_closed}` over direct children found through `snapshot.parents`.
    - Tracks are children that are neither prep tasks nor merge gates.
    - The detail's `children` list keeps its name and shape.
  - **Person:** trimmed, lower-cased, cut before the first `@` when there is text before it. It is named by that handle, and there is no alias config.
  - **Me:** the value is `me` in the `assignee` query. It resolves to the person of the stored login email (`useEmail()`).
  - **Late** (REQ-MILESTONE-UI-023):
    - Open: late when `today > end` or `finish > end`.
    - Closed: late when it closed after `end`.
    - "Behind pace" is pace only.
  - **Dates** (REQ-UI-131): "21 Nov", "1 Dec 2025", "11 May, 16:00", English months, browser time zone for times, and calendar days unshifted.
  - **Plain labels:** Milestones and Reports only. The Beads views keep "x/y closed" and "Prep x/y".
  - **Read-only:** the console mutates nothing. No new runtime dependency (`@base-ui/react` 1.9.0 is already installed).
- **Non-goals:**
  - AI usage and Data coverage (gin-console-5c4).
  - Visual tokens and the strand (gin-console-rm-strung).
  - The filter bar layout and the click rule (gin-console-rm-beads-views).
  - Lane "Unclaimed" wording.
  - A people alias config.
  - gin-workflow JSON.

## Approach Options
### Option 1: Backend owns the rules, then frontend tracks by concern
- **Summary:**
  - One backend module `beads/definitions.py` serves the Beads API, Projects and Reports.
  - The frontend reads `blocked` and `child_counts`.
  - Frontend concerns follow in dependency order: placement, progress, dates, tooltips, people, milestones, labels.
- **Pros:**
  - Each rule has one owner and one test file.
  - Every frontend track reviews one concern.
- **Cons:**
  - Eleven tracks.
  - Several frontend tracks touch `ListRow.tsx`, `GanttChart.tsx` and `BeadHeader.tsx` one after another.

### Option 2: Frontend computes the rules from all beads
- **Summary:** always load closed beads and compute blocked, progress and people in TypeScript.
- **Pros:** fewer backend changes.
- **Cons:** Projects and Reports still count in Python, so the rule keeps two copies. This is the defect the epic fixes. The design rejected it.

### Recommended Approach
- **Selected option:** Option 1, the approach the user chose in discuss.
- **Rationale:** the definitions are the business rules reviewers must check, so they live once in Python. The frontend tracks are then mostly rendering changes with their own tests.

## Scope
- **In scope:**
  - The 13 added and 19 modified REQs of `02-spec-delta.md`.
  - Their gin-qa cases and e2e specs.
  - The example project data TC-1 needs.
  - TC-1.
- **Out of scope:** the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: One lane (roadmap AI capacity 1); the frontend tracks edit the same row, card, header and Gantt files in turn, so they run in order on feat/one-set-of-definitions.
```

## Tasks
### Track 1: Rules module and the Beads API
- **Dependencies**: none
- **Requirements**: REQ-BEADS-021, REQ-BEADS-022, REQ-BEADS-023
- **Files**:
  - Create `backend/src/gin_console/beads/definitions.py`
  - Modify `backend/src/gin_console/beads/models.py:36-68` (`ChildCounts` model, `child_counts` field on `BeadSummary`)
  - Modify `backend/src/gin_console/beads/source.py:148-185, 271-300` (`blocked` from `is_blocked`; `child_counts` computed once per request)
  - Test `backend/tests/test_beads_definitions.py`
  - Test `backend/tests/test_beads_source.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a small module with exact rules and listed edge cases; the API change is one field.
- **Acceptance criteria**:
  - The REQ-BEADS-021 and REQ-BEADS-022 scenarios that concern the API, and the REQ-BEADS-023 rule, have tests named for them.
  - `child_counts` is the same with and without `closed=1`.
  - `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
- **Estimated complexity**: medium

Interfaces produced (`gin_console.beads.definitions`):
- `is_blocked(ident: str, row: Mapping[str, Any], snapshot: Snapshot) -> bool`: `row.get("status") != "closed" and (row.get("status") == "blocked" or ident in snapshot.blocked)`.
- `is_done(row: Mapping[str, Any]) -> bool`: `row.get("status") == "closed"`.
- `counts_toward(row: Mapping[str, Any]) -> bool`: `row.get("issue_type") != "milestone" and not is_merge_gate(row)`.
- `@dataclass(frozen=True) class Counts: total: int = 0; closed: int = 0; prep_total: int = 0; prep_closed: int = 0`.
- `child_counts(snapshot: Snapshot) -> dict[str, Counts]`, built in one pass over `snapshot.parents.items()`:
  - It skips a child missing from `rows`, a parent missing from `rows`, and merge gates.
  - It adds prep tasks (`row_is_prep`) to `prep_*` and every other child to `total`/`closed`.
- `person_key(value: str | None) -> str | None`:
  - Strip and lower-case the value.
  - Return `None` when it is empty.
  - Return the text before the first `@` when that text is not empty, else the whole text.
- `beads/models.py`: `class ChildCounts(BaseModel)` with `model_config = ConfigDict(strict=True)` and four `int = 0` fields. `BeadSummary.child_counts: ChildCounts = Field(default_factory=ChildCounts)`, which `BeadDetail` inherits.

Steps:
1. Write `backend/tests/test_beads_definitions.py` with the `bead`/`dep` helpers of `tests/fake_export.py` and `build_snapshot`. Use `# REQ-BEADS-021`, `# REQ-BEADS-022` and `# REQ-BEADS-023` comments.
   - `is_blocked`:
     - status `blocked` without blockers → true;
     - in-progress with an open blocker → true;
     - the child of an epic blocked by an open bead → true;
     - a closed bead with an open blocker → false;
     - an `external:` blocker → false.
   - `child_counts` for epic `e-1` with tracks `t-1` and `t-2` (closed), `t-3` (open), the closed prep `p-1` (labels `["prep"]`) and the gate `g-1` titled `external: .planning/plans/p.md#1` → `Counts(3, 2, 1, 1)`. A task with no children has no key.
   - `person_key`: `"  GiangDHWHTBR@gmail.com "` → `"giangdhwhtbr"`; `"giangdhwhtbr"` → `"giangdhwhtbr"`; `""` and `None` → `None`; `"@x"` → `"@x"`.
2. Run `uv run --directory backend pytest tests/test_beads_definitions.py`. It fails: the module does not exist.
3. Write `definitions.py` per the interfaces. It imports `is_merge_gate` from `beads.lanes`, `row_is_prep` from `beads.prep` and `Snapshot` from `beads.snapshot`. Run the test again: it passes.
4. In `test_beads_source.py`, add `# REQ-BEADS-022` tests:
   - `list_beads(snapshot, closed=False)` gives `e-1` `child_counts` `{3, 2, 1, 1}` while `t-1`, `t-2` and `p-1` are absent.
   - `get_bead` of a task gives zeros.
   - Add a `# REQ-BEADS-007` test: a bead with status `blocked` and no blocker has `blocked` true.
   - Run them: they fail.
5. Add `ChildCounts` to `models.py`.
   - In `source.py`, give `_fields(snapshot, ident, counts: dict[str, Counts])` a `"child_counts": asdict(counts.get(ident, Counts()))` entry.
   - Replace `:168` with `"blocked": is_blocked(ident, raw, snapshot)`.
   - Compute `counts = child_counts(snapshot)` once in `list_beads` and once in `get_bead`.
6. Run `uv run --directory backend pytest`, `uv run --directory backend ruff check .` and `uv run --directory backend mypy`: all pass.
7. Commit: `git commit -m "feat(beads): one module for blocked, done and child counts (gin-console-rm-definitions)"`

### Track 2: Projects and Team counts follow the rule
- **Dependencies**: Track 1
- **Requirements**: REQ-SERVER-006, REQ-REPORTS-009, REQ-REPORTS-010, REQ-BEADS-021, REQ-BEADS-023
- **Files**:
  - Modify `backend/src/gin_console/projects/source.py:14-46` (`count_beads`)
  - Modify `backend/src/gin_console/reports/source.py:51-75` (`blocked` on each `ReportBead`)
  - Modify `backend/src/gin_console/reports/models.py:62-84, 277-292` (`ReportBead.blocked`, `TeamBead.blocked`)
  - Modify `backend/src/gin_console/reports/team.py:42, 99-136, 162-213, 237` (buckets, `blocked`, members by person)
  - Modify `backend/src/gin_console/reports/service.py:58-59` (`member_of` by person)
  - Test `backend/tests/test_beads_prep.py`, `backend/tests/test_project_beads.py`, `backend/tests/test_collect.py`, `backend/tests/test_reports_source.py`, `backend/tests/test_reports_team.py`
  - Create `backend/tests/test_counts_agree.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded edits in two contexts that already import `beads` helpers; the risk is existing count tests, which the spec's new scenarios replace.
- **Acceptance criteria**:
  - Every new or changed scenario of REQ-SERVER-006, REQ-REPORTS-009 and REQ-REPORTS-010 has a test named for it.
  - `test_counts_agree.py` proves three numbers equal on one export:
    - the Projects `blocked`;
    - the number of `list_beads` rows with `blocked` true that are neither prep tasks nor milestones;
    - the Team `blocked` of a milestone whose epics hold the same leaf beads.
  - The backend checks pass.
- **Estimated complexity**: medium

Interfaces consumed: `is_blocked`, `person_key` (Track 1). Interfaces produced:
- `ReportBead.blocked: bool = False`, set in `read_beads` next to the parent override at `:65-66`.
- `TeamBead.blocked: bool`.
- `member_of(bead: ReportBead) -> str` returns `person_key(bead.assignee) or UNASSIGNED`. `team.py:42` `_member` delegates to it.

Steps:
1. Write the failing tests:
   - `# REQ-SERVER-006 test_server_006_blocked_whatever_status` in `test_beads_prep.py`, with the `counts(tmp_path, rows)` helper:
     - Beads: a status `blocked` bead, an in-progress bead with an open blocker, an in-progress bead without blockers, and the blocker itself (open).
     - Expect `blocked == 2` and `in_progress == 1`.
   - `# REQ-REPORTS-009 test_reports_009_buckets_and_members` in `test_reports_team.py`:
     - The scenario's four beads, the last assigned `bao@example.com` with an open blocker.
     - Buckets `open, open, in_progress, open`; members `Unassigned, ann, bao, bao`; `blocked` true for the first and last.
   - `# REQ-REPORTS-010 test_reports_010_blocked_whatever_status`: `team.blocked == 3`, `team.in_progress == 1` and `team.open == 3`.
   - `# REQ-BEADS-023 test_beads_023_same_handle_two_domains`: `ann@a.example` and `ann@b.example` give one member `ann`.
   - `test_counts_agree.py` with `# REQ-BEADS-021`, the REQ-BEADS-021 scenario placed under a milestone:
     - Milestone `m1`; epic `f` with parent `m1`.
     - Under `f`: `a` open; epic `e` blocked by `a`, with child `e.1`; `b` status `blocked`; in-progress `c` blocked by `a`; in-progress `d`.
     - `count_beads(...).blocked` and the number of `list_beads(snapshot, closed=True)` rows with `blocked` true that are not milestones are both `4` (`e`, `e.1`, `b`, `c`).
     - The Team report of `m1` gives `team.blocked == 3` (`e.1`, `b`, `c`), because `e` has a track and is out of the Team scope (REQ-REPORTS-009).
2. Run `uv run --directory backend pytest tests/test_beads_prep.py tests/test_reports_team.py tests/test_counts_agree.py`. The new tests fail.
3. Change `count_beads`:
   - `blocked = sum(1 for i, r in rows.rows.items() if i not in left_out and counts_toward(r) and is_blocked(i, r, rows))`.
   - `in_progress` counts `active` rows with status `in_progress` that are not `is_blocked`.
4. Change `read_beads` to set `fields["blocked"] = is_blocked(ident, raw, snapshot)`.
5. Change `team.py`:
   - The bucket is `"closed"` for status `closed`, `"in_progress"` for status `in_progress` and not `bead.blocked`, else `"open"`.
   - `_figures` `blocked = sum(1 for r in rows if r.bucket != "closed" and r.blocked)`.
   - `TeamBead(..., blocked=bead.blocked)`.
6. Change `member_of` and `_member` as in the interfaces.
7. Update the existing tests that pinned the old counts: `test_beads_prep.py:69, 89`, `test_project_beads.py:88`, `test_collect.py`, and any `test_reports_team.py` figure.
   - Set each to the value the REQ text now gives.
   - Do not weaken an assertion.
8. Run the backend checks: all pass.
9. Commit: `git commit -m "feat(reports): Projects and Team count blocked by one rule (gin-console-rm-definitions)"`

### Track 3: Blocked first in the views
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-031, REQ-UI-033, REQ-BEADS-021
- **Files**:
  - Modify `frontend/src/features/beads/api.ts:9-40, 90-131` (`ChildCounts` type, `child_counts` on `BeadSummary`, validator)
  - Modify `frontend/src/features/beads/beadFixtures.ts:8` (default `child_counts`)
  - Modify `qa/e2e/support/api.ts:69` (default `child_counts` in the e2e `bead` builder)
  - Modify `frontend/src/features/beads/columns.ts:32-65` (`boardColumn`, `focusColumn`)
  - Modify `frontend/src/features/beads/BoardColumn.tsx:20-25` (count without prep, "+ n prep")
  - Modify `frontend/src/features/milestones/GanttChart.tsx:44-57, 389-395` and `frontend/src/features/milestones/GanttTab.tsx:37-43` (Blocked look from the epic's bead)
  - Modify `frontend/src/features/reports/teamApi.ts` (`blocked` on `TeamBead`) and `frontend/src/features/reports/team/BeadTable.tsx:35` (Blocked label from `blocked`)
  - Test `frontend/src/features/beads/columns.test.ts`, `frontend/src/features/beads/FocusView.test.tsx`, `frontend/src/features/beads/BoardView.test.tsx`, `frontend/src/features/milestones/GanttChart.test.tsx`, `frontend/src/features/reports/team/BeadTable.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** an order change in two pure functions plus small render changes. `stateOf`, `StateMark` and `GraphNode` follow `boardColumn`, so their tests show any knock-on.
- **Acceptance criteria**:
  - The REQ-UI-031 scenarios "Blocked first" and "Prep tasks counted apart", the REQ-UI-033 scenario "In progress and blocked", and the REQ-BEADS-021 scenario "Blocked epic on the Gantt" have tests.
  - The frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
- `type ChildCounts = { total: number; closed: number; prep_total: number; prep_closed: number }` and `BeadSummary.child_counts: ChildCounts`. `isSummary` checks four numbers.
- `boardColumn(bead)`:
  1. `"done"` when the status is closed;
  2. `"blocked"` when `bead.blocked`;
  3. `"backlog"` when the status is deferred;
  4. `"ready"` when `bead.ready`;
  5. `"in_progress"` when `working(bead)`;
  6. `null` otherwise.
- `focusColumn(bead)`:
  1. `null` when closed;
  2. `"blocked"` when `bead.blocked`;
  3. `"in_flight"` when `working(bead)`;
  4. `"next_up"` when `bead.ready && bead.priority <= 1`;
  5. `null` otherwise.
- `BoardColumn` header text:
  - `n` is the number of non-prep beads (`isPrep(b.labels)`) and `p` the number of prep beads.
  - It reads `${n}` when `p` is 0, else `${n} + ${p} prep`.
  - The existing "n of total" form stays for Done.
- The epic row component of `GanttChart.tsx` (the one that computes `look` at `:395`) takes `epicBead: BeadSummary | undefined`. The look is `LOOK.blocked` when `epicBead?.blocked && epic.status !== "closed"`, else `lookOf(epic.status)`. `GanttTab` builds a `Map` of `beads.beads` by id, next to the `kinds` map at `:39-43`, and `GanttChart` passes each row its epic's bead.

Steps:
1. Update the tests first:
   - `columns.test.ts:13-30`: add an in-progress bead and a deferred bead, both with `blocked: true`, expected in Blocked.
   - `columns.test.ts:55-75`: `pb` is now expected in `blocked`.
   - `FocusView.test.tsx`: the same.
   - Add a BoardView test: two blocked tracks and one blocked prep bead (`labels: ["prep"]`) → header "2 + 1 prep".
   - `GanttChart.test.tsx`: an open epic whose bead has `blocked: true` shows the Blocked look.
   - `BeadTable.test.tsx`: a bead with status `in_progress` and `blocked: true` reads Blocked.
   - Name each with its REQ.
2. Run `pnpm -C frontend test --run src/features/beads/columns.test.ts`: it fails.
3. Add the types and the validator to `api.ts`.
   - Default `child_counts: { total: 0, closed: 0, prep_total: 0, prep_closed: 0 }` in `beadFixtures.ts` and in `qa/e2e/support/api.ts` `bead`.
   - Change `columns.ts`, `BoardColumn.tsx`, `GanttChart.tsx`/`GanttTab.tsx`, `teamApi.ts` and `BeadTable.tsx` per the interfaces.
4. Run `pnpm -C frontend test --run`, `typecheck`, `lint`: all pass. Fix tests whose expectation changed because of the REQ, and only those.
5. Commit: `git commit -m "feat(beads): blocked beads show as blocked first (gin-console-rm-definitions)"`

### Track 4: Progress from child counts
- **Dependencies**: Track 3
- **Requirements**: REQ-UI-130, REQ-BEADS-022, REQ-UI-028, REQ-UI-044, REQ-UI-120
- **Files**:
  - Create `frontend/src/features/beads/progress.ts`
  - Modify `frontend/src/features/beads/prep.ts:9-26` (remove `childCounts` and `prepLabel`, which move to `progress.ts`)
  - Modify `frontend/src/features/beads/graph.ts:74-84, 239-256, 300` (node `done`/`total` from `child_counts`)
  - Modify `frontend/src/features/beads/LanesCanvas.tsx:44-52`, `frontend/src/features/beads/LaneGraphCanvas.tsx:34-43`
  - Modify `frontend/src/features/beads/tree.ts:128`, `frontend/src/features/beads/ListRow.tsx:91-103`
  - Modify `frontend/src/features/beads/BeadBody.tsx:10`, `frontend/src/features/beads/ProgressCard.tsx:29-31`, `frontend/src/features/beads/epicOverview.ts:14-31`
  - Modify `frontend/src/features/milestones/GanttChart.tsx:403-411`, `frontend/src/features/milestones/gantt.ts:230-231`
  - Test `frontend/src/features/beads/progress.test.ts`, `graph.test.ts`, `ListView.test.tsx`, `BeadDetailPage.test.tsx`, `epicOverview.test.ts`, `EpicOverview.test.tsx`, `frontend/src/features/milestones/GanttChart.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** it replaces three counters with one reader. There are several callers, but each change is mechanical once the interface is fixed.
- **Acceptance criteria**:
  - The REQ-UI-130 scenarios and the REQ-UI-120 scenario "Progress with closed beads hidden" have tests.
  - No code calls `progressOf(beads)`, `childCounts` or `epicProgress(...).closed/total` any more.
  - The frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced (`@/features/beads/progress`):
- `progressOf(bead: Pick<BeadSummary, "child_counts">): { done: number; total: number; prepDone: number; prepTotal: number }`, from `child_counts`.
- `prepLabel(p): string` returns `` `Prep ${p.prepDone}/${p.prepTotal}` `` (the Beads views and the bead page).
- `prepWords(p): string` returns `` `Prep ${p.prepDone} of ${p.prepTotal} done` `` (PM views, used by Track 9).
- `epicProgress(children)` keeps `byState` and `points`, and drops `closed` and `total`. `ProgressCard` takes `closed` and `total` from `progressOf(bead)`.
- `layout(...)` no longer takes a progress map. A node's `done`/`total` come from `progressOf(node.bead)`.

Steps:
1. Write `progress.test.ts` (`# REQ-UI-130`): `progressOf(bead("e", { child_counts: { total: 5, closed: 3, prep_total: 3, prep_closed: 1 } }))` → `{3, 5, 1, 3}`, plus `prepLabel` and `prepWords`. Then add the scenario tests:
   - List row "3/5 closed" with Show closed off and the closed children absent from the loaded beads (`ListView.test.tsx`).
   - The Graph node "3 of 5 done" in the same setup (`graph.test.ts`).
   - The Gantt row "3/5 closed" from `child_counts` (`GanttChart.test.tsx`; Track 9 rewords it).
   - Epic Progress "4 of 8 tracks closed · 50%" from `child_counts` with only open children loaded (`EpicOverview.test.tsx`).
2. Run them: they fail.
3. Write `progress.ts` and switch every caller listed in Files. `BeadBody.tsx` uses `progressOf(bead)` of the detail. `gantt.ts:230-231` uses `progressOf` of the epic's bead (the `epicBead` Track 3 passes to each row, zeros when it is missing) for the row height. Remove `childCounts` and the old `progressOf`.
4. Run the frontend checks: all pass. Update the old tests of the removed functions (`prep.test.ts:14-29`, `graph.test.ts:116, 316-319`, `epicOverview.test.ts:10-28`) to the new functions.
5. Commit: `git commit -m "feat(beads): progress reads child counts whatever the filters (gin-console-rm-definitions)"`

### Track 5: One date format
- **Dependencies**: Track 4
- **Requirements**: REQ-UI-131, REQ-UI-028, REQ-UI-044, REQ-UI-120
- **Files**:
  - Modify `frontend/src/lib/dates.ts` (new helpers, `factDate` removed)
  - Modify `frontend/src/lib/format.ts:16` (relative time keeps the full date-time as its tooltip text)
  - Modify `frontend/src/features/milestones/format.ts:5-12, 25-41` (`shortDate`, `dateOf` replaced; `workdaysAfter` stays here as the only copy)
  - Modify `frontend/src/features/reports/team/format.ts:8-30` (`formatDate` and the local `workdaysAfter` removed; `lateDays` imports `workdaysAfter`)
  - Modify the call sites:
    - beads: `BeadHeader.tsx:33-34`, `laneFacts.ts:25`, `ListRow.tsx:125`, `CommentList.tsx:49`, `MilestoneCard.tsx:14, 40`;
    - milestones: `MilestonesPage.tsx:111, 139-146`, `ForecastCard.tsx:10`, `MilestonePage.tsx:123`, `GanttTab.tsx:72`, `GanttChart.tsx:189, 324, 511`, `gantt.ts:120, 128, 144`, `RetroTab.tsx:7`;
    - reports: `headlines.ts:24`, `team/TeamFigures.tsx:88, 135`, `team/BeadTable.tsx:89`, `team/ClosedPerDayChart.tsx:31, 68, 122`, `team/MilestoneLine.tsx:17, 27`, `ReportsPage.tsx:175`;
    - other: `my-tasks/MyTasksPage.tsx:163`.
  - Test `frontend/src/lib/dates.test.ts` and the tests that pin dates: `reports/team/format.test.ts:21`, `RetroTab.test.tsx:27`, `BeadDetailPage.test.tsx:494-495`, `BeadsPage.test.tsx:460, 472`, `EpicOverview.test.tsx`, `milestones/format.test.ts`, `gantt.test.ts`, `MilestonePage.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** one helper with exact rules and many mechanical call-site swaps. Time zones need care in tests.
- **Acceptance criteria**:
  - The three REQ-UI-131 scenarios, the REQ-UI-028 scenario "Badges and facts" and the REQ-UI-120 scenario "Milestone forecast late" have tests.
  - `grep -rn "toLocaleDateString\|toLocaleString\|factDate\|shortDate" frontend/src --include=*.tsx --include=*.ts` lists only `lib/dates.ts` and tests.
  - The frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced (`@/lib/dates`). `today` is `"YYYY-MM-DD"`, defaulting to the browser's local date:
- `formatDate(iso: string, today?: string): string`:
  - A plain `YYYY-MM-DD` is read as that calendar day, in UTC.
  - A timestamp is read in the browser's time zone.
  - The result is `"5 Nov"`, or `"1 Dec 2025"` outside the current year.
- `formatDateTime(iso: string, today?: string): string` returns `"11 May, 16:00"` or `"11 May 2025, 16:00"`, in the browser's time zone.
- `formatRange(start: string, end: string, today?: string): string`:
  - `"10 Nov – 1 Dec"` within the current year;
  - `"3 Nov – 28 Nov 2025"` within one other year;
  - `"14 Dec 2026 – 8 Jan 2027"` across years.
- A value that is not a date is returned unchanged.

Steps:
1. Write `dates.test.ts` (`# REQ-UI-131`) with `today = "2026-11-21"`:
   - the three scenarios;
   - an invalid string returned as is;
   - `formatDate("2026-12-01", "2026-11-21")` reads "1 Dec" in a separate `dates.tz.test.ts` that sets `process.env.TZ = "America/Los_Angeles"` on its first line, before any import.
   - Run it: it fails.
2. Write the helpers, then swap every call site listed in Files.
   - The milestone window on `MilestoneCard` becomes `formatRange(start, end, today)`.
   - `PullLine`'s relative time keeps its text and gets the full `formatDateTime` as its title. Track 6 turns it into a tooltip.
3. Update the date expectations of the tests listed in Files to the REQ-UI-131 form. Pin `today` in each test where the year rule matters.
4. Run the frontend checks: all pass.
5. Commit: `git commit -m "feat(ui): one date format across the console (gin-console-rm-definitions)"`

### Track 6: Tooltips and the Legend
- **Dependencies**: Track 5
- **Requirements**: REQ-UI-132, REQ-UI-133, REQ-REPORTS-013
- **Files**:
  - Create `frontend/src/components/ui/tooltip.tsx`, `frontend/src/components/Legend.tsx`, `frontend/src/lib/definitions.ts`
  - Modify `frontend/src/components/SizeBadge.tsx`, `frontend/src/features/beads/PrepChip.tsx`, `frontend/src/features/beads/LaneChip.tsx`, `frontend/src/features/beads/CountBadge.tsx`, `frontend/src/features/beads/StateMark.tsx:28-42`, `frontend/src/features/beads/BoardColumn.tsx:20-25`
  - Modify `frontend/src/features/projects/ProjectCard.tsx:121-145`, `frontend/src/features/projects/PullLine.tsx:16`, `frontend/src/features/reports/team/TeamFigures.tsx:18-45`
  - Modify `frontend/src/features/beads/BeadsPage.tsx:62`, `frontend/src/features/milestones/MilestonePage.tsx:132-135`, `frontend/src/features/reports/ReportsPage.tsx:170-175` (Legend control)
  - Test `frontend/src/components/ui/tooltip.test.tsx`, `frontend/src/components/Legend.test.tsx`, `frontend/src/features/projects/ProjectCard.test.tsx`, `frontend/src/features/beads/CountBadge.test.tsx`, `frontend/src/features/reports/team/TeamFigures.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** two new shared components with keyboard, focus and screen-reader behaviour, applied to many marks. Accessibility details are easy to get wrong.
- **Acceptance criteria**:
  - The REQ-UI-132 and REQ-UI-133 scenarios have tests.
  - Every element listed in REQ-UI-132 renders through `Hint` and has no `title` of its own.
  - The Team figures carry their rule text.
  - The frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
- `@/components/ui/tooltip`: `Hint({ text, children, delay = 300 }: { text: string; children: React.ReactElement; delay?: number })`.
  - It renders `Tooltip.Root` → `Tooltip.Trigger render={children} delay={delay}` → `Tooltip.Portal` → `Tooltip.Positioner sideOffset={4} className="z-50"` → `Tooltip.Popup className="max-w-72 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"`.
  - It imports `Tooltip` from `@base-ui/react/tooltip`.
  - It gives the trigger `aria-describedby={id}`, pointing to a `<span id={id} hidden>{text}</span>` (`useId`), so the description exists whether or not the popup is open.
  - Base UI opens on hover and focus and closes on Escape, blur and pointer leave.
- `@/lib/definitions`: `DEFINITIONS`, a `const` record of one-sentence texts keyed:
  - `blocked`, `done`, `inProgress`, `ready`, `deferred`;
  - `progress`;
  - `size`, `points`;
  - `prep`;
  - `lane`;
  - `comments`, `dependencies`.
  - `blocked` is exactly "Blocked: status blocked, or waiting on an open blocker of its own or of a parent. Prep tasks are counted apart."
  - `countHint(rule: keyof typeof DEFINITIONS, scope: string): string` appends ` Counted in ${scope}.`
- `@/components/Legend`: `Legend()` renders a `Popover` from `@base-ui/react/popover` whose trigger is a button "Legend". The popup:
  - lists the state marks (the `StateMark` of each state), `SizeBadge`, `PrepChip`, `LaneChip` and both `CountBadge` kinds, each with its `DEFINITIONS` text, then the `blocked`, `done` and `progress` texts;
  - uses the popup class of `ProjectSwitcher.tsx:53` with `max-w-[calc(100vw-2rem)]`;
  - returns focus to the trigger on close, which is Base UI's default.

Steps:
1. Write the failing tests:
   - `tooltip.test.tsx`: focusing the trigger shows the text; Escape hides it; `aria-describedby` points to an element holding the text.
   - `Legend.test.tsx`: activating "Legend" lists the five state words and the blocked text; Escape closes it and focus is on "Legend".
   - `ProjectCard.test.tsx`: the blocked count is focusable (`tabIndex={0}`) and focusing it shows `DEFINITIONS.blocked`.
   - `CountBadge.test.tsx`: no `title`, and hover shows the dependencies text.
   - `TeamFigures.test.tsx` (`# REQ-REPORTS-013`): the Open figure has a hint naming the blocked rule.
2. Run them: they fail.
3. Write `tooltip.tsx`, `definitions.ts` and `Legend.tsx`.
   - Wrap the listed elements in `Hint`, removing their `title`.
   - The Projects counts and Team figure values get `tabIndex={0}`. Row and card marks stay out of the tab order, because the Legend covers keyboard users.
   - Add `<Legend />` beside the `h1` of the Beads, milestone and Reports pages.
4. Run the frontend checks, then `pnpm -C frontend build`: all pass.
5. Commit: `git commit -m "feat(ui): tooltips and a legend for marks and counts (gin-console-rm-definitions)"`

### Track 7: The assignee, one person per handle, and Me
- **Dependencies**: Track 6
- **Requirements**: REQ-UI-135, REQ-BEADS-023, REQ-BEADS-024, REQ-UI-034, REQ-UI-044, REQ-UI-065, REQ-UI-082, REQ-UI-121, REQ-UI-028
- **Files**:
  - Create `frontend/src/lib/people.ts`, `frontend/src/features/beads/AssigneeName.tsx`
  - Modify `frontend/src/features/beads/filters.ts:46-102, 116-187, 221-230` (person matching, `me`, options, `resolveMe`)
  - Modify `frontend/src/features/beads/BeadsView.tsx:49-69` (resolve `me` before `filterBeads`)
  - Modify `frontend/src/features/beads/BeadFilterBar.tsx:116-124`, `frontend/src/features/beads/MobileFiltersSheet.tsx:169-177` (labels "Me", "Unassigned")
  - Modify `frontend/src/features/beads/columns.ts:79-89` (group by person, "Unassigned")
  - Modify `frontend/src/features/beads/ListRow.tsx:122-123`, `frontend/src/features/beads/BeadCard.tsx:36-37`, `frontend/src/features/beads/TracksTable.tsx:85`, `frontend/src/features/beads/BeadHeader.tsx:30-31`, `frontend/src/features/reports/team/BeadTable.tsx` (assignee cell)
  - Modify `frontend/src/features/my-tasks/match.ts:3-8` (uses `samePerson`)
  - Test `frontend/src/lib/people.test.ts`, `frontend/src/features/beads/filters.test.ts`, `frontend/src/features/beads/columns.test.ts:79-100`, `frontend/src/features/beads/FocusView.test.tsx:91-100`, `frontend/src/features/beads/BeadCard.test.tsx:53-56`, `frontend/src/features/beads/ListView.test.tsx`, `frontend/src/features/beads/BeadDetailPage.test.tsx`, `frontend/src/features/beads/EpicOverview.test.tsx`, `frontend/src/features/my-tasks/match.test.ts`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** one small rule applied across the filter, the grouping and five displays, with a URL value (`me`) to resolve. Each piece is bounded.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-135, REQ-BEADS-023 (frontend), REQ-BEADS-024, REQ-UI-034, REQ-UI-082 ("Old link with an email" included), REQ-UI-065 "Bare card", REQ-UI-044 "Owner is not the assignee", REQ-UI-121 "Tracks table", and REQ-UI-028 "No assignee" has a test.
  - `grep -rn "\.owner" frontend/src/features --include=*.ts --include=*.tsx` shows no use as an assignee.
  - The frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
- `@/lib/people`:
  - `personOf(value: string | null | undefined): string | null`: the same rule as `person_key`. Its test cases copy `test_beads_definitions.py`'s.
  - `samePerson(a, b): boolean`.
- `AssigneeName({ assignee }: { assignee: string | null })` renders `personOf(assignee)` inside `Hint text={assignee}`, or `<span className="text-muted-foreground">Unassigned</span>`.
- `filters.ts`:
  - `effectiveAssignee` is removed. The match uses `personOf(bead.assignee)`.
  - The `assignee` values are a person, `unassigned` or `me`. A stored email is read as its person, which keeps old links working.
  - `optionsOf` returns `assignees: ["me", ...("unassigned" if any bead lacks an assignee), ...sorted persons]`.
  - `resolveMe(filters: BeadFilters, email: string | null): BeadFilters` replaces `me` with `personOf(email)`, or drops it when the email is null.
- `columns.ts` `assigneeOf` returns `personOf(bead.assignee) ?? ""`. The last row is titled "Unassigned".
- `BeadHeader`:
  - The "Owner" fact is removed.
  - "Assignee" is always shown, through `AssigneeName`.
  - "Created by" is `personOf(bead.created_by) ?? personOf(bead.owner)`.

Steps:
1. Write `people.test.ts` with the shared cases, and add the scenario tests named with their REQs:
   - Replace `BeadCard.test.tsx:53-56` "shows owner as assignee fallback" with "shows Unassigned when only an owner is set".
   - Replace the `columns.test.ts:94` owner-fallback test with "groups an email and its handle in one row".
   - In `filters.test.ts`, add Me, Unassigned with an owner, and an old email link.
   - Run them: they fail.
2. Implement `people.ts`, `AssigneeName.tsx`, the filter changes and `resolveMe` (`BeadsView` reads `useEmail()` from `@/app/identity` and passes the resolved filters to every `filterBeads` call and to `ListView`). Then the display changes and `match.ts`.
3. Run the frontend checks: all pass.
4. Commit: `git commit -m "feat(beads): real assignee, one person per handle and a Me filter (gin-console-rm-definitions)"`

### Track 8: Milestone status and one late rule
- **Dependencies**: Track 7
- **Requirements**: REQ-MILESTONE-UI-022, REQ-MILESTONE-UI-023, REQ-REPORTS-012, REQ-UI-095, REQ-MILESTONE-UI-001, REQ-UI-120, REQ-UI-028
- **Files**:
  - Create `frontend/src/features/milestones/late.ts`, `frontend/src/features/beads/milestoneStatus.tsx`
  - Modify `frontend/src/features/beads/useMilestones.ts:6` (`enabled` parameter)
  - Modify `frontend/src/features/beads/StateMark.tsx:23-35` (milestone beads draw `MilestoneStatus`)
  - Modify `frontend/src/features/beads/BeadsView.tsx:46`, `frontend/src/features/beads/BeadDetailPage.tsx` (provide milestone statuses)
  - Modify `frontend/src/features/beads/MilestoneCard.tsx:12-53`, `frontend/src/features/reports/team/MilestoneLine.tsx:6-23`, `frontend/src/features/milestones/MilestonesPage.tsx:139`
  - Modify `frontend/src/features/reports/headlines.ts:16-30`, `frontend/src/features/reports/ReportsPage.tsx:81-146, 256-257`, `frontend/src/features/reports/velocity/VelocityTab.tsx:11`
  - Test `frontend/src/features/milestones/late.test.ts`, `frontend/src/features/beads/StateMark.test.tsx`, `frontend/src/features/beads/BeadDetailPage.test.tsx`, `frontend/src/features/beads/graph.test.ts`, `frontend/src/features/milestones/MilestonesPage.test.tsx`, `frontend/src/features/reports/headlines.test.ts`, `frontend/src/features/reports/team/TeamSection.test.tsx`, `frontend/src/features/reports/ReportsPage.test.tsx`, `frontend/src/features/reports/velocity/VelocityTab.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** it crosses beads, milestones and reports, moves the Milestones list request from the Velocity tab up to the Reports page, and adds a context. Ordering and fallbacks need care.
- **Acceptance criteria**:
  - Every scenario of REQ-MILESTONE-UI-022 and REQ-MILESTONE-UI-023, REQ-REPORTS-012 "late active milestone", REQ-UI-095 "late milestone headline", "team headline" and "velocity tab", and REQ-MILESTONE-UI-001 "lanes and finish" has a test.
  - `GET /api/milestones?project=alpha` is requested once per project and refresh on the Reports page.
  - The frontend checks pass.
- **Estimated complexity**: high

Interfaces produced:
- `@/features/milestones/late`: `lateOf(m: { status: string; end: string | null; finish?: string | null; closedOn?: string | null }, today: string): boolean`.
  - It compares ISO dates by their first 10 characters.
  - It returns `false` when `end` is null.
  - Closed: late when `closedOn` is set and after `end`.
  - Open: late when `today > end`, or `finish` is set and after `end`.
- `@/features/beads/milestoneStatus`: `MilestoneStatusProvider({ statuses, children })` with `statuses: ReadonlyMap<string, MilestoneStatus>`, and `useMilestoneStatus(id: string): MilestoneStatus | null`.
- `useMilestones(project: string, enabled = true)`: no request while `enabled` is false.
- `StateMark`: when `bead.issue_type === "milestone"` and `useMilestoneStatus(bead.id)` is not null, it renders `<MilestoneStatus status={…} />`. Otherwise it renders as today.
- `BeadsView` provides statuses from its `useMilestones` data. `BeadDetailPage` calls `useMilestones(project, bead?.issue_type === "milestone")` and provides them.
- `MilestoneCard`:
  - It uses `MilestoneStatus` for the Status fact.
  - It marks the forecast late with `lateOf({ status, end, finish }, today)`.
  - A closed milestone shows no late mark, because the list has no closing date.
- `MilestoneLine` `chipText(m, finish)`:
  - Closed: "Closed · on time" or "Closed · <n> d late" (from `lateDays`).
  - Otherwise: the `MilestoneStatus` word, plus " · late" when `lateOf({ status, end, finish, closedOn: closed_on }, today)`.
- `ReportsPage`:
  - It requests `fetchMilestones(selected)` from `@/features/milestones/api` once per single project and refresh, and keeps it in state.
  - It passes `finish` (the entry of the selected milestone) to the Team section and the headline, and the loaded list to `VelocityTab` as `loaded: ReadonlyMap<string, MilestoneList>`. `VelocityTab` fetches only the projects not in `loaded`.
  - The Velocity headline reads `days_per_point` from that list.
- `teamHeadline(report, finish: string | null)`, in order:
  1. "No milestones";
  2. closed → "Finished …";
  3. before start → "Starts …";
  4. `lateOf` → `${closed} of ${scope} done · late` (warn);
  5. `pace_needed > pace` → `… done · behind pace` (warn);
  6. else `… done · on pace`.

Steps:
1. Write `late.test.ts` (`# REQ-MILESTONE-UI-023`) with the four scenarios. Then write the failing scenario tests:
   - the milestone bead header reads "Active" and its Graph node "Active", with the status from `GET /api/beads/milestones`;
   - the fallback reads the bead status when that request answers 502;
   - the Team chip "Active · late";
   - the headlines "27 of 64 done · late" and "27 of 64 done · on pace";
   - the Milestones list late color;
   - the Velocity tab requesting the list once.
   - Run them: they fail.
2. Implement `late.ts`, the context, `useMilestones(enabled)`, `StateMark`, and the card, line, headline, page and Velocity changes. Delete the label maps at `MilestoneCard.tsx:12` and `MilestoneLine.tsx:6`.
3. Update `headlines.test.ts`, `ReportsPage.test.tsx:341, 406, 466-469` and `TeamSection.test.tsx:61` to the new texts.
4. Run the frontend checks: all pass.
5. Commit: `git commit -m "feat(milestone-ui): one milestone status and one late rule (gin-console-rm-definitions)"`

### Track 9: Plain labels in PM views
- **Dependencies**: Track 8
- **Requirements**: REQ-UI-134, REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-021, REQ-REPORTS-013, REQ-REPORTS-018, REQ-UI-095
- **Files**:
  - Modify `frontend/src/features/milestones/MilestonesPage.tsx:92-98, 147`, `frontend/src/features/milestones/ForecastCard.tsx:18-34`, `frontend/src/features/milestones/MilestoneVelocity.tsx:22-28`
  - Modify `frontend/src/features/milestones/GanttChart.tsx:411, 451-460` (labels "n of m done", `prepWords`, "Spec approved", "Spec not approved yet")
  - Modify `frontend/src/features/reports/velocity/VelocityTable.tsx:5`, `frontend/src/features/reports/velocity/VelocityFigures.tsx:8`, `frontend/src/features/reports/headlines.ts:32-35`, `frontend/src/features/reports/team/TeamFigures.tsx:88-135`
  - Test `MilestonesPage.test.tsx:236-242`, `ForecastCard.test.tsx:42-94`, `MilestonePage.test.tsx:449-469`, `GanttChart.test.tsx:37-55, 204`, `VelocityTab.test.tsx:35-71`, `headlines.test.ts:44-49`, `reports/sections.test.tsx:128`, `TeamFigures.test.tsx:25-77`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** string changes fixed word for word by the REQ text, each with a pinned test.
- **Acceptance criteria**:
  - Each label of REQ-UI-134 and each changed string of REQ-MILESTONE-UI-001, -016, -021, REQ-REPORTS-013, -018 and REQ-UI-095 is asserted by a test with its REQ.
  - Each renamed label carries a `Hint` with its `DEFINITIONS` text where REQ-UI-134 asks for one.
  - The frontend checks pass.
- **Estimated complexity**: low

Strings (old → new):
- Milestones list:
  - headers "Lanes" → "Parallel lanes" and "Say/do" → "Commitment met";
  - row "Say/do 62%" → "Commitment met 62%".
- Forecast card:
  - "Default lanes" → "Parallel lanes";
  - "Unestimated" and "<n> unestimated" → "Not estimated" and "<n> not estimated";
  - "No estimate: every open epic is unestimated" → "No estimate: no open epic is estimated".
- Milestone velocity: "Say/do" → "Commitment met" and "d/pt" → "Days per point".
- Gantt:
  - "<c>/<t> closed" → "<c> of <t> done";
  - "Prep <c>/<t>" → `prepWords`;
  - "Spec confirmed" → "Spec approved";
  - "No confirmed spec" → "Spec not approved yet".
- Velocity:
  - table head "Say/do" → "Commitment met", "d/pt" → "Days per point", "Planned d/pt" → "Planned days per point";
  - figure "<x> d/pt" → "<x> days per point".
- Headline: "<x> d/pt" → "<x> days per point".
- Team figures:
  - "<x> / day" → "<x> done per day";
  - "needs <x> / day to end on <end>" → "needs <x> done per day to finish by <end>";
  - "<x> / week" → "<x> done per week";
  - "<n> unclaimed" → "<n> unassigned";
  - "<n> still open after end" → "<n> open after the end date".

Steps:
1. Change the pinned tests to the new strings, with their REQ comments. Run them: they fail.
2. Change the strings and add the `Hint`s.
3. Run the frontend checks: all pass.
4. Commit: `git commit -m "feat(ui): plain labels in milestone and report views (gin-console-rm-definitions)"`

### Track 10: QA cases and their tests
- **Dependencies**: Track 9
- **Requirements**: REQ-BEADS-021, REQ-BEADS-022, REQ-BEADS-023, REQ-BEADS-024, REQ-UI-130, REQ-UI-131, REQ-UI-132, REQ-UI-133, REQ-UI-134, REQ-UI-135, REQ-MILESTONE-UI-022, REQ-MILESTONE-UI-023, REQ-SERVER-006, REQ-UI-028, REQ-UI-031, REQ-UI-033, REQ-UI-034, REQ-UI-044, REQ-UI-065, REQ-UI-082, REQ-UI-095, REQ-UI-120, REQ-UI-121, REQ-REPORTS-009, REQ-REPORTS-010, REQ-REPORTS-012, REQ-REPORTS-013, REQ-REPORTS-018, REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-021
- **Files**:
  - Create cases in `qa/cases/{beads,ui,reports,milestone-ui,server}/` for every scenario of the added REQs and the changed scenarios of the modified REQs (`e2e` for UI, `api` for server and reports API)
  - Modify, re-pin or remove the cases pinned to the modified REQs, as `gin-qa cases plan --change gin-console-rm-definitions` lists them
  - Create or modify the e2e specs under `qa/e2e/{beads,ui,reports,milestone-ui}/`:
    - set localStorage `gin-console.email` with `addInitScript`;
    - stub `/api/*` with `qa/e2e/support/api.ts` and `qa/e2e/support/reports.ts`.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases from written scenarios and specs in existing patterns, with one judgement per pinned case.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-rm-definitions` prints `ok`.
  - `gin-qa cases plan --change gin-console-rm-definitions` lists nothing missing or stale.
  - `gin-qa e2e plan` lists none of these cases as missing or stale.
  - `npx playwright test qa/e2e/ui qa/e2e/beads qa/e2e/milestone-ui qa/e2e/reports --trace off --workers 4` passes on the built UI.
- **Estimated complexity**: medium

Steps:
1. Run `gin-qa cases plan --change gin-console-rm-definitions` and `gin-qa cases check --change gin-console-rm-definitions`. Write, update, re-pin and remove cases per `qa/guidelines.md`: explicit URLs, one action per step, stubbable preconditions.
2. Write or update the e2e specs. Build the UI with `pnpm -C frontend build`, run the specs, and fix them until they pass. Report a product defect instead of changing product code.
3. Commit: `git commit -m "test(qa): cases and e2e specs for one set of definitions (gin-console-rm-definitions)"`

### Track 11: Check on the deployed console
- **Dependencies**: Track 10
- **Requirements**: REQ-BEADS-021, REQ-BEADS-022, REQ-BEADS-023, REQ-BEADS-024, REQ-UI-130, REQ-UI-131, REQ-UI-132, REQ-UI-133, REQ-UI-134, REQ-UI-135, REQ-MILESTONE-UI-022, REQ-MILESTONE-UI-023, REQ-REPORTS-012, REQ-REPORTS-013
- **Files**:
  - Modify `scripts/make_example_project.py:220-300` (`build()`: the cases TC-1 needs)
  - Modify `docs/changes/gin-console-rm-definitions-definitions/05-tests.md` (TC-1 result)
  - Create `qa/evidence/<date>-definitions-tc1/` (gitignored, kept on disk)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** add sample data, run the written check and record it.
- **Acceptance criteria**:
  - TC-1 is recorded as `pass, claude (Playwright on the Tailscale build of <commit>, N/N checks, screenshots in qa/evidence/...)`.
  - Every expectation of TC-1 is a scripted check or is named as seen in a screenshot.
  - No page error occurred.
- **Estimated complexity**: low

Steps:
1. In `build()`, add to the example project, with `Project.add` and `Project.task`:
   - a task with status `blocked` and no blocker;
   - an in-progress task blocked by an open task;
   - an open epic blocked by an open bead, with one open child;
   - one task assigned `giangdhwhtbr` and one assigned `giangdhwhtbr@gmail.com`;
   - a task with an owner and no assignee (`assignee=None`);
   - an active milestone whose epics' estimates finish after its `end`, so that `gin milestone list` reports a later `finish`.
   - Run `python3 scripts/make_example_project.py` and check that `example` loads in the console.
2. Deploy the branch to the systemd service, one command at a time:
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health`
   - Expected: `active` and `200`.
3. Write a Playwright script outside the repo and run it with `NODE_PATH=/home/gin/scotty/node_modules node <script> qa/evidence/<date>-definitions-tc1`:
   - Set localStorage `gin-console.email` to `giangdhwhtbr@gmail.com`.
   - Run at 1440×900 and at 390×844, both at deviceScaleFactor 2.
   - Make one check per TC-1 expectation, each in try/catch with a screenshot, and fail on any `pageerror`.
   - Save `results.json` and the script.
4. Look at the key screenshots, then record TC-1 in `05-tests.md` with the exact N/N count of `results.json`. Commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-rm-definitions)"`

## Integration
- **Branch**: `feat/one-set-of-definitions`
- **Merge strategy**: sequential

## Validation
- [ ] `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- [ ] `gin specs lint --change gin-console-rm-definitions --against master` prints `ok`, and `gin specs trace --change gin-console-rm-definitions` lists no missing REQ.
- [ ] `gin-qa cases check --change gin-console-rm-definitions` prints `ok`.
- [ ] TC-1 passed on the deployed console.

## Notes
- The user may override `Model:` and `Effort:` before approval.
- The parent bead stays open until a human confirms the merge. Each track bead closes when its tests and review pass.
- Line numbers come from `master` at 2ca8410 and drift after earlier tracks; anchor edits on content.
- Epic gin-console-5c4 removes AI usage and Data coverage and also changes REQ-UI-095. Whichever change archives second takes the other's text and refreshes the `base:` hash with `gin specs hash REQ-UI-095`.
- `MilestoneCard` shows no late mark for a closed milestone, because `GET /api/milestones` has no closing date. REQ-MILESTONE-UI-023's closed scenarios are covered by the Team tab, which has `closed_on`.
