# Plan: Team tab counts epics not yet split into tasks

Epic: gin-console-e4g
Spec: `01-proposal.md`, `02-spec-delta.md`, `03-design.md` in this folder. Diagram: `docs/specs/reports/diagrams/team-tab-activity.md`.

## Objective
The Team tab scope of a milestone also holds every epic under it that has no child bead. An epic with children still counts only through its children (REQ-REPORTS-009). The KPIs, chart, status bar, member table and bead list follow the new scope without other changes.

Every scenario of REQ-REPORTS-009 has a test naming it. `gin-qa cases check --change gin-console-e4g` prints `ok`. TC-1 passes on the Tailscale deploy.

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
- **Problem statement:** a member's epics that are not yet split into tasks are missing from the Team tab. On 2026-11-13, a member with 3 open epics and 1 closed task showed 1 assigned and 1 closed.
- **Success criteria:**
  - Everything in the Objective.
  - `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
  - `gin specs lint --change gin-console-e4g --against master` prints `ok`, and `gin specs trace --change gin-console-e4g` lists no missing REQ.
- **Global constraints** (from the spec):
  - "No child bead" means no bead of any type or status has the epic as its parent.
  - An epic with children is never counted; its children are.
  - A non-epic bead with children still counts.
  - The nearest epic of a counted epic is itself.
  - Backend only, in `reports/team.py`. The frontend, the Beads page and the KPI definitions of REQ-REPORTS-010 are unchanged.
  - New and changed tests carry their REQ-ID.
- **Non-goals:**
  - Counting an epic together with its tasks.
  - Any other report.

## Approach Options
### Option 1: admit childless epics in `_scope`
- **Pros:** a three-line change in one function; `_Tree.children` already holds the data.
- **Cons:** none known.

### Option 2: count every epic and subtract child counts later
- **Cons:**
  - Spreads the rule over the KPI code.
  - Breaks the one-row-per-bead list.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** it is the design confirmed on 2026-11-13.

## Scope
- **In scope:**
  - `backend/src/gin_console/reports/team.py` (`_scope`).
  - `backend/tests/test_reports_team.py`.
  - `qa/cases/reports/` (REQ-REPORTS-009 cases).
  - `05-tests.md`.
- **Out of scope:** the frontend, other routers and other reports.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend) and Track 2 (QA cases) share no file and Track 2 needs only the spec, so they run together; Track 3 is the human check after both merge.
```

## Tasks

### Track 1: Childless epics in the Team scope
- **Dependencies**: none
- **Requirements**: REQ-REPORTS-009
- **Files**:
  - Modify `backend/src/gin_console/reports/team.py:78-90` (`_scope`)
  - Test `backend/tests/test_reports_team.py` (new scenario tests; fixtures of existing tests only where the new rule changes their expected counts)
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** a small change to one function with written scenarios. Existing team tests show any fixture the new rule affects.
- **Acceptance criteria**:
  - Every scenario of REQ-REPORTS-009 has a passing test naming it.
  - Any existing team test whose expectation changes is updated with a comment naming REQ-REPORTS-009 and listed in the report.
  - Backend pytest, ruff and mypy pass.
- **Estimated complexity**: low

Interfaces (unchanged signature):
```python
def _scope(tree: _Tree, beads: list[ReportBead], milestone_id: str) -> list[tuple[ReportBead, ReportBead]]:
    """(bead, nearest epic) of every bead under an epic of the milestone; an epic only while it has no child bead."""
    rows: list[tuple[ReportBead, ReportBead]] = []
    for bead in beads:
        if bead.issue_type == "milestone":
            continue
        if bead.issue_type == "epic" and tree.children.get(_key(bead)):
            continue  # split into tasks: its children carry the work
        epics = tree.epics_of(bead)  # starts with the bead itself when it is an epic
        if any(e.parent == milestone_id for e in epics):
            rows.append((bead, epics[0]))
    rows.sort(key=lambda r: r[0].id)
    return rows
```
`_key` comes from `reports/service.py`; import it if `team.py` does not have it yet.

Steps:

1. **Tests.** In `backend/tests/test_reports_team.py`, add tests built like `test_reports_009_nested_scope`, each with a `# REQ-REPORTS-009` comment:
   - `test_reports_009_epic_not_yet_split`:
     - Under `m2`: epics `e2`, `e3` and `e4` with `assignee="ann"` and no children; epic `e5` with one closed child task `e5.1` assigned to `ann`.
     - Expected: `[b.id for b in r.beads] == ["e2", "e3", "e4", "e5.1"]`.
     - `e2`, `e3` and `e4` each have `epic.id` equal to their own id.
     - `ann`'s member row has `scope == 4` and `closed == 1`.
   - `test_reports_009_nested_epic_without_children`: `m2` ← epic `e1` ← epic `e1.1`, which has no children → `[b.id for b in r.beads] == ["e1.1"]` and `e1.1`'s `epic.id == "e1.1"`.
2. Run `uv run --directory backend pytest tests/test_reports_team.py`. Expect the two new tests to fail.
3. Change `_scope` as in Interfaces.
4. Run `uv run --directory backend pytest tests/test_reports_team.py tests/test_reports_team_api.py`.
   - When an existing test now fails only because its fixture has an epic without children under the milestone, update that test's expectation to the new rule, or give the epic a child where the test is about something else, with a `# REQ-REPORTS-009` comment.
   - Never weaken an assertion that does not depend on scope.
   - List every such change in the report.
5. Run:
   ```bash
   uv run --directory backend pytest
   uv run --directory backend ruff check .
   uv run --directory backend mypy
   ```
   Expect all to pass.
6. Commit: `git commit -m "feat(reports): Team scope counts epics not yet split into tasks (gin-console-e4g)"`

### Track 2: QA cases
- **Dependencies**: none
- **Requirements**: REQ-REPORTS-009
- **Files**:
  - Modify `qa/cases/reports/` (the REQ-REPORTS-009 cases: re-pin the existing ones, and add cases for the two new scenarios)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** case writing per scenario with the gin-qa CLI.
- **Acceptance criteria**: `gin-qa cases check --change gin-console-e4g` prints `ok`, with no new finding in `gin-qa cases check`.
- **Estimated complexity**: low

Steps:

1. Run `gin-qa cases plan --change gin-console-e4g --format json`.
2. For each missing scenario, run `gin-qa cases new reports --type api --title "<title>" --req REQ-REPORTS-009`. Fill it as a standalone case: project `alpha`, milestone `m2` and the epics named in Preconditions, one request per step (`GET /api/reports/team?project=alpha&milestone=m2`), and Expected exactly as the scenario says.
3. Update each stale REQ-REPORTS-009 case to the new text if its content changed, and `gin-qa cases pin` it.
4. Repeat `gin-qa cases check --change gin-console-e4g` until `ok`.
5. Commit: `git commit -m "test(qa): cases for epics not yet split into tasks (gin-console-e4g)"`

### Track 3: Check on the Tailscale deploy
- **Dependencies**: Track 1, Track 2
- **Requirements**: REQ-REPORTS-009
- **Files**:
  - Modify `docs/changes/gin-console-e4g-team-leaf-epics/05-tests.md` (TC-1 result)
- **Provider role**: `general`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** deploy with the recorded commands and record the user's result.
- **Human gate**: the user walks TC-1 on `https://instance-20260515-2304.tail5ca54e.ts.net:8443` and reports pass or fail.
- **Acceptance criteria**: TC-1 is recorded as `pass, giangdhwhtbr, <date> (Tailscale build of <commit>)`.
- **Estimated complexity**: low

Steps:

1. Deploy from the main checkout on `feat/gin-console-e4g-team-leaf-epics`:
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - the health check
   - Report the rollback command.
2. Ask the user to walk TC-1 and record the result.

## Integration
- **Branch**: `feat/gin-console-e4g-team-leaf-epics`
- **Merge strategy**: parallel-then-merge; Track 3 deploys the merged branch.

## Validation
- [ ] Backend pytest, ruff and mypy pass
- [ ] `gin specs lint --change gin-console-e4g --against master` prints `ok`, and `gin specs trace --change gin-console-e4g` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-e4g` prints `ok`
- [ ] TC-1 passes on the Tailscale deploy

## Notes
- The Parent Bead `gin-console-e4g` stays open until the user confirms the merge. Track beads close after their tests and review pass.
- Per the user's solo-work rule, the spec and this plan go in one commit at plan approval. Ship merges locally and then pushes `master`.
