# Plan: Milestones page: list, Graph, Gantt, kick-start preview

Epic: gin-console-djg
Spec: `docs/changes/gin-console-djg-milestones/` (`01-proposal.md`, `02-spec-delta.md`, `03-design.md`, `05-tests.md`)
Input contract: `gin-harness/docs/changes/gin-harness-6s4-milestones/design.md` ("JSON contract", schema 1)

## Objective
A Milestones entry in the sidebar lists a project's milestones from `gin-workflow milestone list --all --json`. A milestone page draws its schedule as a Gantt from `gin-workflow milestone show --json`, previews other kick-start dates read-only, and shows a Graph tab scoped to the milestone. Milestone beads no longer count as ready and no longer appear in the Beads views.

**Goal:** every scenario of the added REQ-MILESTONE-UI-001..009 and of the modified REQ-BEADS-007, REQ-SERVER-006, REQ-UI-055 and REQ-UI-057 has a passing test that names its REQ-ID, and the four verify commands pass.

**Architecture:**
- Backend: a new bounded context `gin_console/milestones/{models,source,router}.py` (ADR-0001). `source.run_gw` wraps `run_json`. `CollectError` gains `returncode` and `stderr`, so a `cause` can be told apart. A `GwRunner` is injected into `create_app`.
- Ready exclusion: one line each in `projects/collect.py` and `beads/source.py`.
- Frontend: a new feature folder `src/features/milestones/`. It contains the client and guards, the `useLoad` hook, pure date math in `format.ts` and `gantt.ts`, and the components `MilestonesPage`, `MilestonePage`, `GanttTab`, `GanttChart`, `MilestoneGraph`, `MilestoneError`, `MilestoneStatus` and `CopyCommand`.
- Shared frontend edits:
  - `useBeads` drops milestone beads unless it is asked to keep them.
  - `useVisibleInterval` accepts `null`, meaning load once.
  - A generic `components/Tabs.tsx` replaces the body of `DetailTabs`.

**Tech Stack:** FastAPI, pydantic 2, pytest; React 19, TypeScript 6, Tailwind 4, lucide-react, vitest and Testing Library. All of these are installed; no new dependency.

**Global Constraints (verbatim from the spec):**
- Writing anything: create, update, kickstart, move, estimate, and close stay CLI-only; the console shows the command instead (read-only, ADR-0001).
- Any `milestone` JSON schema other than 1.
- Changing the bead detail page reached by a direct link to a milestone id.
- A chart or date library; the Gantt is built with the existing stack.
- Re-forecasting from actual start or close dates; the console draws the plan gin-workflow computes.
- Linux, macOS, and native Windows: `projects/collect.py` runs `gin-workflow` through Git Bash on Windows. Keep those paths working (AGENTS.md).

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
- Problem statement:
  - The PM chooses a kick-start date by comparing plans, but milestones exist only in the CLI's text output.
  - Milestone beads would show up as ready work and as parents in the Beads views.
- Success criteria:
  - The Milestones list, Gantt, preview and Graph agree with `gin-workflow milestone list|show --json` for a real project.
  - The ready counts and the Beads views ignore milestone beads.
  - `uv run --directory backend pytest`, ruff, mypy, and `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- Constraints and non-goals: see Global Constraints.

## Approach Options
### Option 1: Graph tab reuses the Dependencies engine scoped to the milestone (chosen in discuss)
- Summary:
  - The Graph tab calls `scopeGraph(beads, milestoneId)` over the unfiltered bead list, and `GraphCanvas` draws the result.
  - The Gantt reads `milestone show`.
- Pros:
  - External nodes with titles, zoom and keyboard navigation come for free.
  - One `useBeads` filter makes the project graph and the List tree ignore milestone parents.
- Cons: the Graph reads dependencies from `bd` while the Gantt reads them from `show`. Both read the same database, so they can differ only within the 5-second cache.

### Option 2: Graph built from `milestone show`
- Summary: both tabs read one response.
- Pros: one fetch.
- Cons:
  - External nodes have no title or status.
  - It needs a second canvas or fake `BeadSummary` objects.

### Recommended Approach
- Selected option: 1.
- Rationale: the design confirmed it, and it needs the least new code.

## Scope
- In scope:
  - backend:
    - `projects/collect.py`
    - `beads/source.py`
    - new `milestones/`
    - `app.py`
    - tests and fakes
  - frontend:
    - new `features/milestones/`
    - `components/Tabs.tsx`
    - `features/beads/{useBeads,DetailTabs,graph.test,GraphPage.test}`
    - `lib/useVisibleInterval.ts`
    - `app/{App,Layout}.tsx` and their tests
  - `README.md` (Features)
  - `05-tests.md` (manual cases)
- Out of scope: see Global Constraints.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Tracks 1-4 touch disjoint files (backend collectors, backend milestones context, useBeads, frontend milestones list with nav) and only share interfaces fixed in this plan, so they run together; Track 5 needs Track 4's client and page shell, Track 6 needs Tracks 3 and 5, and Track 7 needs a person with a browser.
```

## Tasks

Each track's verify commands come from AGENTS.md:
- Backend tracks run `uv run --directory backend pytest`, `uv run --directory backend ruff check .` and `uv run --directory backend mypy`.
- Frontend tracks run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint` and `pnpm -C frontend build`.

Commit after a track only when the orchestrator or the user authorizes it. gin-console's AGENTS.md forbids commits that were not asked for.

---

### Track 1: Milestones are not ready work
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-007, REQ-BEADS-007, REQ-SERVER-006
- **Files**:
  - Modify `backend/src/gin_console/projects/collect.py:128-135` (ready rows without milestones)
  - Modify `backend/src/gin_console/beads/source.py:101-107` (`ready` false for a milestone)
  - Modify `backend/tests/fakes.py` (`Fake` takes `ready`)
  - Test `backend/tests/test_collect.py`
  - Test `backend/tests/test_beads_source.py`
- **Provider role**: `backend`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** two one-line filters with given tests; no design judgement.
- **Acceptance criteria**:
  - An open milestone that `bd ready` lists has `ready` false in `/api/beads`.
  - It is not counted in `beads.ready` on `/api/projects` and is not listed in `epics`.
  - Every existing test still passes.
- **Estimated complexity**: low

**Interfaces produced:** none. `Beads` and `BeadSummary` keep their shape.

- [ ] **Step 1: Failing tests.**

  In `backend/tests/fakes.py`, give `Fake` a `ready` argument:
  ```python
      def __init__(
          self,
          fail: dict[str, Exception | int] | None = None,
          issues: list[dict[str, str]] | None = None,
          ready: list[dict[str, str]] | None = None,
      ) -> None:
          self.calls: list[list[str]] = []
          self.envs: list[dict[str, str]] = []
          self.fail = fail or {}
          self.issues = ISSUES if issues is None else issues
          self.ready = READY if ready is None else ready
  ```
  In `__call__`, replace `"ready": READY,` with `"ready": self.ready,`.

  Append to `backend/tests/test_collect.py`, and add `from fakes import ISSUES, READY, Fake` to its imports:
  ```python
  # REQ-SERVER-006
  # REQ-MILESTONE-UI-007
  def test_server_006_milestone_not_counted_as_ready(
      monkeypatch: pytest.MonkeyPatch, tmp_path: Path
  ) -> None:
      milestone = {"id": "m1", "title": "M", "issue_type": "milestone", "status": "open"}
      patch(
          monkeypatch,
          Fake(
              issues=[*ISSUES, milestone],
              ready=[*READY, {"id": "m1", "issue_type": "milestone"}],
          ),
      )
      _, result = Collector().get("p", tmp_path)
      beads = beads_of(result)
      assert beads.ready == 2
      assert [e.id for e in beads.epics] == ["e1", "e2"]
  ```
  Append to `backend/tests/test_beads_source.py`:
  ```python
  # REQ-BEADS-007
  # REQ-MILESTONE-UI-007
  def test_beads_007_milestone_is_never_ready() -> None:
      fake = FakeBd([bead("m-1", issue_type="milestone"), bead("r-1")], ready=["m-1", "r-1"])
      by_id = {b.id: b for b in list_beads(fake, CWD, closed=False)}
      assert (by_id["m-1"].ready, by_id["r-1"].ready) == (False, True)
  ```
- [ ] **Step 2: Run them.** Run `uv run --directory backend pytest tests/test_collect.py tests/test_beads_source.py -k "milestone"`. Expected: 2 failed (`beads.ready == 3`, and `m-1` ready is `True`).
- [ ] **Step 3: Code.**

  In `collect_beads` (`collect.py`), replace the `ready = run_json(...)` line with:
  ```python
          # a milestone is not work, even when nothing blocks it (REQ-MILESTONE-UI-007)
          ready = [
              issue
              for issue in run_json(["bd", "ready", "--limit", "0", "--json"], path)
              if not (isinstance(issue, dict) and issue.get("issue_type") == "milestone")
          ]
  ```
  In `list_beads` (`beads/source.py`), replace `"ready": bead.id in ready,` with:
  ```python
                  "ready": bead.id in ready and bead.issue_type != "milestone",
  ```
- [ ] **Step 4: Run them again.** Run the Step 2 command. Expected: 2 passed. Then run the full backend verify commands. Expected: all pass, ruff and mypy clean.

---

### Track 2: Milestones API
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-005
- **Files**:
  - Modify `backend/src/gin_console/projects/collect.py:21-22,96-97` (`CollectError` carries `returncode` and `stderr`)
  - Create `backend/src/gin_console/milestones/__init__.py` (empty)
  - Create `backend/src/gin_console/milestones/models.py`
  - Create `backend/src/gin_console/milestones/source.py`
  - Create `backend/src/gin_console/milestones/router.py`
  - Modify `backend/src/gin_console/app.py:12-20,28-36,48` (inject `run_gw`, mount the router)
  - Create `backend/tests/fake_gw.py`
  - Test `backend/tests/test_milestones_source.py`
  - Test `backend/tests/test_milestones_api.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded new context that copies the beads context pattern. It has a clear error table and one shared-class extension.
- **Acceptance criteria**: every REQ-MILESTONE-UI-008 scenario passes, along with the source-level `cause` tests and every existing test.
- **Estimated complexity**: medium

**Interfaces produced** (the frontend in Tracks 4-6 relies on these JSON shapes):
```
GET /api/milestones?project=<name>                       200 MilestoneList | 404 | 502 {error, cause}
GET /api/milestones/{project}/{id}[?start=YYYY-MM-DD]    200 MilestoneDetail | 404 | 422 | 502 {error, cause}
cause: "outdated" | "tracking" | "schema" | null
MilestoneList   = {milestones: MilestoneEntry[], unassigned_epics: int, today: "YYYY-MM-DD"}
MilestoneEntry  = {id, title, status, start, end, kickoff: str|null, finish: str|null,
                   epics: {total: int, closed: int}, warnings: int|null, error: str|null}
MilestoneDetail = {id, title, description, status, start, end, kickoff: str|null, schedule_start,
                   preview: bool, today, finish: str|null, overflow_days: int, epics: EpicPlan[]}
EpicPlan        = {id, title, status, estimate_days: int|null, planned_start, planned_end,
                   depends_on: str[], external_depends_on: {id, milestone: str|null}[],
                   warnings: {code: str, days: int|null}[]}
```
Python names: `MilestonesError(message, cause)`, `GwRunner`, `run_gw(args, cwd)`, `list_milestones(run, cwd)` and `show_milestone(run, cwd, milestone_id, start)`. Also `build_router(settings, run, clock)` and `create_app(..., run_gw: GwRunner = run_gw, ...)`.

- [ ] **Step 1: `CollectError` keeps the exit code and stderr.** In `collect.py`, replace the class with:
  ```python
  class CollectError(Exception):
      """A command failed; the message is shown to the operator in the UI."""

      def __init__(self, message: str, returncode: int | None = None, stderr: str = "") -> None:
          super().__init__(message)
          self.returncode = returncode
          self.stderr = stderr  # the full stderr: the message keeps only its first 200 characters
  ```
  In `run_json`, replace the non-zero-exit `raise` with:
  ```python
          raise CollectError(
              f"{cmd[0]} exited {done.returncode}: {done.stderr.strip()[:200]}",
              done.returncode,
              done.stderr,
          )
  ```
- [ ] **Step 2: Fake and fixtures.** Create `backend/tests/fake_gw.py`:
  ```python
  """A stand-in for `gin-workflow milestone`: canned schema 1 output, the contract's own examples."""

  from pathlib import Path
  from typing import Any

  LIST: dict[str, Any] = {
      "schema": 1,
      "milestones": [
          {
              "id": "gw-ab1",
              "title": "M1",
              "status": "planned",
              "start": "2026-11-02",
              "end": "2026-12-18",
              "kickoff": None,
              "finish": "2026-12-22",
              "epics": {"total": 6, "closed": 0},
              "warnings": 2,
              "error": None,
          }
      ],
      "unassigned_epics": 3,
      "today": "2026-10-29",
  }
  SHOW: dict[str, Any] = {
      "schema": 1,
      "id": "gw-ab1",
      "title": "M1",
      "description": "",
      "status": "planned",
      "start": "2026-11-02",
      "end": "2026-12-18",
      "kickoff": None,
      "schedule_start": "2026-11-02",
      "preview": False,
      "today": "2026-10-29",
      "finish": "2026-12-22",
      "overflow_days": 2,
      "epics": [
          {
              "id": "gw-rm-x",
              "title": "X",
              "status": "open",
              "estimate_days": 5,
              "planned_start": "2026-11-02",
              "planned_end": "2026-11-06",
              "depends_on": [],
              "external_depends_on": [{"id": "gw-rm-y", "milestone": "gw-ab0"}],
              "warnings": [{"code": "external_blocker"}],
          }
      ],
  }


  class FakeGw:
      """`milestone list` answers `outputs["list"]`, `milestone show` answers `outputs["show"]`."""

      def __init__(
          self, outputs: dict[str, Any] | None = None, failure: Exception | None = None
      ) -> None:
          self.outputs = {"list": LIST, "show": SHOW} if outputs is None else outputs
          self.failure = failure
          self.calls: list[list[str]] = []

      def __call__(self, args: list[str], cwd: Path) -> Any:
          self.calls.append(args)
          if self.failure is not None:
              raise self.failure
          return self.outputs[args[1]]
  ```
- [ ] **Step 3: Failing source tests.** Create `backend/tests/test_milestones_source.py`:
  ```python
  import json
  import subprocess
  from datetime import date
  from pathlib import Path
  from typing import Any

  import pytest
  from fake_gw import LIST, SHOW, FakeGw

  from gin_console.milestones.source import (
      MilestonesError,
      list_milestones,
      run_gw,
      show_milestone,
  )

  CWD = Path("/p")
  # an old gin-workflow: the usage line alone is longer than the 200 characters CollectError keeps
  COMMANDS = "setup,state,unblock,record,quick-check,rules,specs,team,usage,reviewer,hooks"
  OLD = (
      f"usage: gin-workflow [-h] {{{COMMANDS},task,routes,notify,paths,goal,worktree}} ...\n"
      f"gin-workflow: error: argument command: invalid choice: 'milestone' (choose from {COMMANDS})\n"
  )


  def answer(code: int, stdout: str = "", stderr: str = "") -> Any:
      return lambda cmd, **kwargs: subprocess.CompletedProcess(cmd, code, stdout, stderr)


  def cause_of(monkeypatch: pytest.MonkeyPatch, code: int, stderr: str) -> MilestonesError:
      monkeypatch.setattr(subprocess, "run", answer(code, stderr=stderr))
      with pytest.raises(MilestonesError) as caught:
          run_gw(["milestone", "list", "--all", "--json"], CWD)
      return caught.value


  # REQ-MILESTONE-UI-008
  def test_milestone_ui_008_run_gw_returns_json(monkeypatch: pytest.MonkeyPatch) -> None:
      monkeypatch.setattr(subprocess, "run", answer(0, stdout=json.dumps(LIST)))
      assert run_gw(["milestone", "list", "--all", "--json"], CWD) == LIST


  # REQ-MILESTONE-UI-005
  # REQ-MILESTONE-UI-008
  def test_milestone_ui_005_old_gin_workflow_is_outdated(monkeypatch: pytest.MonkeyPatch) -> None:
      assert len(OLD.splitlines()[0]) > 100
      assert cause_of(monkeypatch, 2, OLD).cause == "outdated"


  # REQ-MILESTONE-UI-005
  # REQ-MILESTONE-UI-008
  def test_milestone_ui_005_markdown_tracking(monkeypatch: pytest.MonkeyPatch) -> None:
      error = cause_of(
          monkeypatch, 1, "milestone error: milestones need providers.task_tracking: beads\n"
      )
      assert error.cause == "tracking"


  # REQ-MILESTONE-UI-008
  def test_milestone_ui_008_other_failure_keeps_the_message(monkeypatch: pytest.MonkeyPatch) -> None:
      error = cause_of(monkeypatch, 1, "milestone error: gw-x not found\n")
      assert (error.cause, str(error)) == (None, "gw-x not found")


  # REQ-MILESTONE-UI-005
  def test_milestone_ui_005_unknown_schema() -> None:
      with pytest.raises(MilestonesError) as caught:
          list_milestones(FakeGw({"list": {**LIST, "schema": 2}}), CWD)
      assert caught.value.cause == "schema"
      assert str(caught.value) == "gin-workflow reports milestone schema 2"


  # REQ-MILESTONE-UI-008
  @pytest.mark.parametrize("output", [[], {**LIST, "milestones": [{"id": 1}]}])
  def test_milestone_ui_008_unexpected_output(output: Any) -> None:
      with pytest.raises(MilestonesError) as caught:
          list_milestones(FakeGw({"list": output}), CWD)
      assert caught.value.cause is None


  # REQ-MILESTONE-UI-008
  def test_milestone_ui_008_commands() -> None:
      fake = FakeGw()
      assert list_milestones(fake, CWD).unassigned_epics == 3
      plan = show_milestone(fake, CWD, "gw-ab1", date(2026, 11, 16))
      assert plan.epics[0].external_depends_on[0].milestone == "gw-ab0"
      show_milestone(fake, CWD, "gw-ab1", None)
      assert fake.calls == [
          ["milestone", "list", "--all", "--json"],
          ["milestone", "show", "gw-ab1", "--start", "2026-11-16", "--json"],
          ["milestone", "show", "gw-ab1", "--json"],
      ]


  # REQ-MILESTONE-UI-008
  def test_milestone_ui_008_dates_must_be_iso() -> None:
      bad = {**SHOW, "today": "Oct 29"}
      with pytest.raises(MilestonesError):
          show_milestone(FakeGw({"show": bad}), CWD, "gw-ab1", None)
  ```
- [ ] **Step 4: Run them.** Run `uv run --directory backend pytest tests/test_milestones_source.py`. Expected: a collection error, because `gin_console.milestones` does not exist yet.
- [ ] **Step 5: Models.** Create `backend/src/gin_console/milestones/models.py`:
  ```python
  """`gin-workflow milestone list|show --json`, schema 1, as the console serves it."""

  from typing import Annotated

  from pydantic import BaseModel, StringConstraints

  from gin_console.beads.models import Text

  # the frontend does day arithmetic on these: anything else is refused at the boundary
  IsoDate = Annotated[str, StringConstraints(pattern=r"^\d{4}-\d{2}-\d{2}$")]


  class EpicCount(BaseModel):
      total: int
      closed: int


  class MilestoneEntry(BaseModel):
      id: Text
      title: Text
      status: Text
      start: IsoDate
      end: IsoDate
      kickoff: IsoDate | None
      finish: IsoDate | None
      epics: EpicCount
      warnings: int | None
      error: Text | None


  class MilestoneList(BaseModel):
      milestones: list[MilestoneEntry]
      unassigned_epics: int
      today: IsoDate


  class EpicWarning(BaseModel):
      code: Text
      days: int | None = None


  class ExternalDependency(BaseModel):
      id: Text
      milestone: Text | None


  class EpicPlan(BaseModel):
      id: Text
      title: Text
      status: Text
      estimate_days: int | None
      planned_start: IsoDate
      planned_end: IsoDate
      depends_on: list[Text]
      external_depends_on: list[ExternalDependency]
      warnings: list[EpicWarning]


  class MilestoneDetail(BaseModel):
      id: Text
      title: Text
      description: Text
      status: Text
      start: IsoDate
      end: IsoDate
      kickoff: IsoDate | None
      schedule_start: IsoDate
      preview: bool
      today: IsoDate
      finish: IsoDate | None
      overflow_days: int
      epics: list[EpicPlan]
  ```
- [ ] **Step 6: Source.** Create `backend/src/gin_console/milestones/source.py`:
  ```python
  """Milestones of a project, read through `gin-workflow milestone`; the only module that knows its JSON."""

  from datetime import date
  from pathlib import Path
  from typing import Any, Literal, Protocol

  from pydantic import ValidationError

  from gin_console.milestones.models import MilestoneDetail, MilestoneList
  from gin_console.projects.collect import CollectError, run_json

  GW_TIMEOUT = 30.0
  SCHEMA = 1
  _PREFIX = "milestone error: "
  Cause = Literal["outdated", "tracking", "schema"]


  class MilestonesError(Exception):
      """gin-workflow could not answer; `cause` names a reason the page explains with its fix."""

      def __init__(self, message: str, cause: Cause | None = None) -> None:
          super().__init__(message)
          self.cause: Cause | None = cause


  class GwRunner(Protocol):
      def __call__(self, args: list[str], cwd: Path) -> Any: ...


  def run_gw(args: list[str], cwd: Path) -> Any:
      try:
          return run_json(["gin-workflow", *args], cwd, timeout=GW_TIMEOUT)
      except CollectError as exc:
          if exc.returncode == 2 and "invalid choice: 'milestone'" in exc.stderr:
              raise MilestonesError("this gin-workflow has no milestone command", "outdated") from None
          if "providers.task_tracking: beads" in exc.stderr:
              raise MilestonesError(
                  "milestones need providers.task_tracking: beads", "tracking"
              ) from None
          last = exc.stderr.strip().splitlines()[-1:]
          if last and last[0].startswith(_PREFIX):
              raise MilestonesError(last[0].removeprefix(_PREFIX)[:200]) from None
          raise MilestonesError(str(exc)) from None


  def _schema_1(data: Any, what: str) -> dict[str, Any]:
      if not isinstance(data, dict):
          raise MilestonesError(f"gin-workflow milestone {what} output was not understood")
      if data.get("schema") != SCHEMA:
          raise MilestonesError(f"gin-workflow reports milestone schema {data.get('schema')}", "schema")
      return data


  def list_milestones(run: GwRunner, cwd: Path) -> MilestoneList:
      data = _schema_1(run(["milestone", "list", "--all", "--json"], cwd), "list")
      try:
          return MilestoneList.model_validate(data)
      except ValidationError:
          raise MilestonesError("gin-workflow milestone list output was not understood") from None


  def show_milestone(
      run: GwRunner, cwd: Path, milestone_id: str, start: date | None
  ) -> MilestoneDetail:
      when = [] if start is None else ["--start", start.isoformat()]
      data = _schema_1(run(["milestone", "show", milestone_id, *when, "--json"], cwd), "show")
      try:
          return MilestoneDetail.model_validate(data)
      except ValidationError:
          raise MilestonesError("gin-workflow milestone show output was not understood") from None
  ```
  Create the empty `backend/src/gin_console/milestones/__init__.py`.
- [ ] **Step 7: Run the source tests.** Run `uv run --directory backend pytest tests/test_milestones_source.py`. Expected: all pass.
- [ ] **Step 8: Failing API tests.** Create `backend/tests/test_milestones_api.py`:
  ```python
  from datetime import UTC, datetime, timedelta
  from pathlib import Path
  from typing import Any

  import pytest
  from fake_gw import FakeGw
  from fastapi.testclient import TestClient

  from gin_console.app import create_app
  from gin_console.config import ProjectEntry, Settings
  from gin_console.milestones.source import MilestonesError


  class Clock:
      def __init__(self) -> None:
          self.now = datetime(2026, 10, 29, 3, 0, tzinfo=UTC)

      def __call__(self) -> datetime:
          return self.now


  def make(tmp_path: Path, fake: Any, clock: Clock | None = None) -> TestClient:
      (tmp_path / "proj").mkdir(exist_ok=True)
      (tmp_path / "dist").mkdir(exist_ok=True)
      settings = Settings(
          projects=[
              ProjectEntry(name="proj", path=tmp_path / "proj"),
              ProjectEntry(name="gone", path=tmp_path / "gone"),
          ]
      )
      app = create_app(
          settings,
          static_dir=tmp_path / "dist",
          claude_home=tmp_path,
          run_gw=fake,
          clock=clock or Clock(),
      )
      return TestClient(app, raise_server_exceptions=False)


  # REQ-MILESTONE-UI-008
  def test_milestone_ui_008_list(tmp_path: Path) -> None:
      body = make(tmp_path, FakeGw()).get("/api/milestones", params={"project": "proj"}).json()
      assert body["unassigned_epics"] == 3 and body["today"] == "2026-10-29"
      assert body["milestones"][0]["epics"] == {"total": 6, "closed": 0}
      assert "schema" not in body


  # REQ-MILESTONE-UI-008
  def test_milestone_ui_008_show_is_cached_and_preview_is_not(tmp_path: Path) -> None:
      fake = FakeGw()
      api = make(tmp_path, fake)
      for _ in range(2):
          assert api.get("/api/milestones/proj/gw-ab1").status_code == 200
      assert len(fake.calls) == 1
      for _ in range(2):
          response = api.get("/api/milestones/proj/gw-ab1", params={"start": "2026-11-16"})
          assert response.status_code == 200
      assert fake.calls[1:] == [
          ["milestone", "show", "gw-ab1", "--start", "2026-11-16", "--json"]
      ] * 2


  # REQ-MILESTONE-UI-008
  def test_milestone_ui_008_cache_expires(tmp_path: Path) -> None:
      fake, clock = FakeGw(), Clock()
      api = make(tmp_path, fake, clock)
      api.get("/api/milestones", params={"project": "proj"})
      clock.now += timedelta(seconds=6)
      api.get("/api/milestones", params={"project": "proj"})
      assert len(fake.calls) == 2


  # REQ-MILESTONE-UI-008
  @pytest.mark.parametrize("start", ["next-monday", "2026-02-30"])
  def test_milestone_ui_008_invalid_start(tmp_path: Path, start: str) -> None:
      fake = FakeGw()
      response = make(tmp_path, fake).get("/api/milestones/proj/gw-ab1", params={"start": start})
      assert response.status_code == 422 and fake.calls == []


  # REQ-MILESTONE-UI-008
  @pytest.mark.parametrize(
      "url",
      [
          "/api/milestones?project=nope",
          "/api/milestones?project=gone",
          "/api/milestones",
          "/api/milestones/nope/gw-ab1",
          "/api/milestones/proj/..bad",
      ],
  )
  def test_milestone_ui_008_unknown_project_or_id_is_404(tmp_path: Path, url: str) -> None:
      fake = FakeGw()
      assert make(tmp_path, fake).get(url).status_code == 404 and fake.calls == []


  # REQ-MILESTONE-UI-008
  # REQ-MILESTONE-UI-005
  @pytest.mark.parametrize("cause", ["outdated", "tracking", "schema", None])
  def test_milestone_ui_008_failure_names_its_cause_and_is_not_cached(
      tmp_path: Path, cause: Any
  ) -> None:
      fake = FakeGw(failure=MilestonesError("why", cause))
      api = make(tmp_path, fake)
      for _ in range(2):
          response = api.get("/api/milestones", params={"project": "proj"})
          assert response.status_code == 502
          assert response.json() == {"error": "why", "cause": cause}
      assert len(fake.calls) == 2
  ```
- [ ] **Step 9: Run them.** Run `uv run --directory backend pytest tests/test_milestones_api.py`. Expected: failures, because `create_app` has no `run_gw` parameter and `/api/milestones` returns 404.
- [ ] **Step 10: Router.** Create `backend/src/gin_console/milestones/router.py`:
  ```python
  from collections.abc import Callable
  from datetime import date, datetime, timedelta
  from pathlib import Path

  from fastapi import APIRouter, HTTPException
  from fastapi.responses import JSONResponse

  from gin_console.beads.service import KeyedCache
  from gin_console.beads.source import valid_id
  from gin_console.config import Settings
  from gin_console.milestones.models import MilestoneDetail, MilestoneList
  from gin_console.milestones.source import (
      GwRunner,
      MilestonesError,
      list_milestones,
      show_milestone,
  )

  TTL = timedelta(seconds=5)


  def build_router(settings: Settings, run: GwRunner, clock: Callable[[], datetime]) -> APIRouter:
      router = APIRouter()
      lists = KeyedCache[str, MilestoneList](TTL, clock)
      details = KeyedCache[tuple[str, str], MilestoneDetail](TTL, clock)

      def project_dir(name: str | None) -> Path:
          entry = next((p for p in settings.projects if p.name == name), None)
          if entry is None or not entry.path.is_dir():
              raise HTTPException(status_code=404)
          return entry.path

      def failure(exc: MilestonesError) -> JSONResponse:
          return JSONResponse(status_code=502, content={"error": str(exc), "cause": exc.cause})

      @router.get("/milestones", response_model=MilestoneList)
      def get_milestones(project: str | None = None) -> MilestoneList | JSONResponse:
          cwd = project_dir(project)
          try:
              return lists.get(str(project), lambda: list_milestones(run, cwd))
          except MilestonesError as exc:
              return failure(exc)

      @router.get("/milestones/{project}/{milestone_id}", response_model=MilestoneDetail)
      def get_milestone(
          project: str, milestone_id: str, start: date | None = None
      ) -> MilestoneDetail | JSONResponse:
          cwd = project_dir(project)
          if not valid_id(milestone_id):
              raise HTTPException(status_code=404)
          try:
              if start is not None:  # a preview is asked once per pick: never cached
                  return show_milestone(run, cwd, milestone_id, start)
              return details.get(
                  (project, milestone_id), lambda: show_milestone(run, cwd, milestone_id, None)
              )
          except MilestonesError as exc:
              return failure(exc)

      return router
  ```
  In `app.py`:
  - Add the imports `from gin_console.milestones.router import build_router as build_milestones_router` and `from gin_console.milestones.source import GwRunner` and `from gin_console.milestones.source import run_gw as default_run_gw`.
  - Add the parameter `run_gw: GwRunner = default_run_gw,` after `run_bd`.
  - Add `api.include_router(build_milestones_router(settings, run_gw, clock))` after the beads router.
- [ ] **Step 11: Run everything.** Run `uv run --directory backend pytest tests/test_milestones_api.py tests/test_milestones_source.py`. Expected: all pass. Then run the full backend verify commands. Expected: all pass, and `mypy` (strict) and `ruff` are clean.

---

### Track 3: Milestone beads leave the Beads views
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-006, REQ-MILESTONE-UI-009
- **Files**:
  - Modify `frontend/src/features/beads/useBeads.ts:14-30` (drop milestones; `keepMilestones` argument)
  - Create `frontend/src/features/beads/useBeads.test.tsx`
  - Test `frontend/src/features/beads/graph.test.ts`
  - Test `frontend/src/features/beads/GraphPage.test.tsx`
- **Provider role**: `frontend`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** a one-line filter behind a defaulted argument, with tests given in full.
- **Acceptance criteria**:
  - `useBeads(p, c)` never returns a bead of type `milestone`, and `useBeads(p, c, true)` returns every bead.
  - The project Dependencies graph shows epics under a milestone with their edge and without the milestone.
  - Every existing frontend test still passes.
- **Estimated complexity**: low

**Interfaces produced:** `useBeads(project: string, closed: boolean, keepMilestones = false): { state: BeadsState; retry: () => void }`.

- [ ] **Step 1: Failing tests.** Create `frontend/src/features/beads/useBeads.test.tsx`:
  ```tsx
  import { cleanup, renderHook, waitFor } from "@testing-library/react";
  import { afterEach, describe, expect, it, vi } from "vitest";
  import { bead, json, stubBeads } from "./beadFixtures";
  import { useBeads } from "./useBeads";

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const BEADS = [bead("m-1", { issue_type: "milestone" }), bead("e-a", { issue_type: "epic", parent: "m-1" })];

  async function idsOf(keep?: boolean) {
    stubBeads(() => json(BEADS));
    const { result } = renderHook(() => useBeads("alpha", true, keep));
    await waitFor(() => expect(result.current.state.status).toBe("ok"));
    const state = result.current.state;
    return state.status === "ok" ? state.beads.map((b) => b.id) : [];
  }

  describe("useBeads", () => {
    it("REQ-MILESTONE-UI-009 drops milestone beads, so their epics have no loaded parent", async () => {
      expect(await idsOf()).toEqual(["e-a"]);
    });

    it("REQ-MILESTONE-UI-002 keeps them when asked, for the milestone Graph tab", async () => {
      expect(await idsOf(true)).toEqual(["m-1", "e-a"]);
    });
  });
  ```
  Add inside `describe("scope graph", ...)` in `graph.test.ts`:
  ```ts
    it("REQ-MILESTONE-UI-006 epics whose milestone parent is not loaded are top-level with their edge", () => {
      const beads = [epic("e-a", { parent: "m-1" }), epic("e-b", { parent: "m-1", blocked_by: ["e-a"] })];
      const g = scopeGraph(beads, null, OFF);
      expect(ids(g)).toEqual(["e-a", "e-b"]);
      expect(arrows(g)).toEqual(["e-a>e-b:1"]);
    });
  ```
  Add inside `describe("GraphPage", ...)` in `GraphPage.test.tsx`:
  ```tsx
    it("REQ-MILESTONE-UI-006 the project graph keeps epics under a milestone and leaves the milestone out", async () => {
      open("/beads/p/graph", [
        bead("m-1", { issue_type: "milestone" }),
        epic("e-a", { parent: "m-1" }),
        epic("e-b", { parent: "m-1", blocked_by: ["e-a"] }),
      ]);
      expect(await node("e-a")).toBeInTheDocument();
      expect(await node("e-b")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^m-1/ })).toBeNull();
    });
  ```
- [ ] **Step 2: Run them.** Run `pnpm -C frontend test --run src/features/beads/useBeads.test.tsx src/features/beads/GraphPage.test.tsx`. Expected: the drop test and the GraphPage test fail, because `m-1` is still returned and still drawn. The graph test passes already, since it pins behaviour the filter relies on.
- [ ] **Step 3: Code.** In `useBeads.ts`, change the signature and the success branch:
  ```ts
  /** The beads of a project, refreshed every 10 s while the page is visible; a later answer always wins.
   *  Milestone beads are left out (REQ-MILESTONE-UI-009) unless `keepMilestones`, which only the milestone Graph tab asks for. */
  export function useBeads(
    project: string,
    closed: boolean,
    keepMilestones = false,
  ): { state: BeadsState; retry: () => void } {
  ```
  ```ts
        (beads) => {
          const shown = keepMilestones ? beads : beads.filter((b) => b.issue_type !== "milestone");
          if (id === latest.current) setState({ status: "ok", beads: shown, error: null });
        },
  ```
  Change the `useCallback` dependencies to `[project, closed, keepMilestones]`.
- [ ] **Step 4: Run them again.** Run the Step 2 command, then the frontend verify commands. Expected: all pass.

---

### Track 4: Milestones list, client, and navigation
- **Dependencies**: none (it uses the Track 2 JSON shapes fixed above; tests stub `fetch`)
- **Requirements**: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-005, REQ-UI-055, REQ-UI-057
- **Files**:
  - Modify `frontend/src/lib/useVisibleInterval.ts` (`ms: number | null`)
  - Create `frontend/src/features/milestones/api.ts`
  - Create `frontend/src/features/milestones/format.ts`
  - Create `frontend/src/features/milestones/useLoad.ts`
  - Create `frontend/src/features/milestones/CopyCommand.tsx`
  - Create `frontend/src/features/milestones/MilestoneError.tsx`
  - Create `frontend/src/features/milestones/MilestoneStatus.tsx`
  - Create `frontend/src/features/milestones/MilestonesPage.tsx`
  - Create `frontend/src/features/milestones/milestoneFixtures.ts`
  - Test `frontend/src/features/milestones/api.test.ts`
  - Test `frontend/src/features/milestones/MilestonesPage.test.tsx`
  - Modify `frontend/src/app/Layout.tsx:1,8-13` (NAV entry)
  - Modify `frontend/src/app/App.tsx` (route `/milestones`)
  - Test `frontend/src/app/Layout.test.tsx`
  - Test `frontend/src/app/App.test.tsx`
  - Modify `README.md:7-13` (Features)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded feature folder that follows the beads page patterns. The hook's stale handling and the guards need care, but the specification is complete.
- **Acceptance criteria**:
  - The REQ-MILESTONE-UI-001 and -005 scenarios pass on `MilestonesPage`.
  - The nav has five links with Milestones marked on `/milestones` and `/milestones/alpha/m-1`.
  - `/milestones` renders the page.
  - Every existing test passes.
- **Estimated complexity**: medium

**Interfaces produced** (used by Tracks 5 and 6):
```ts
// api.ts
export type Cause = "outdated" | "tracking" | "schema";
export type MilestoneEntry = { id: string; title: string; status: string; start: string; end: string; kickoff: string | null;
  finish: string | null; epics: { total: number; closed: number }; warnings: number | null; error: string | null };
export type MilestoneList = { milestones: MilestoneEntry[]; unassigned_epics: number; today: string };
export type EpicWarning = { code: string; days: number | null };
export type ExternalDependency = { id: string; milestone: string | null };
export type EpicPlan = { id: string; title: string; status: string; estimate_days: number | null; planned_start: string;
  planned_end: string; depends_on: string[]; external_depends_on: ExternalDependency[]; warnings: EpicWarning[] };
export type MilestoneDetail = { id: string; title: string; description: string; status: string; start: string; end: string;
  kickoff: string | null; schedule_start: string; preview: boolean; today: string; finish: string | null;
  overflow_days: number; epics: EpicPlan[] };
export class MilestonesError extends Error { readonly kind: Cause | null }
export function fetchMilestones(project: string): Promise<MilestoneList>;
export function fetchMilestone(project: string, id: string, start: string | null): Promise<MilestoneDetail>;
export const milestonesPath: (project: string) => string;            // "/milestones?project=p"
export function milestonePath(project: string, id: string, tab?: "gantt" | "graph", start?: string | null): string;
// useLoad.ts
export type LoadState<T> = { status: "loading" } | { status: "error"; error: MilestonesError }
  | { status: "ok"; data: T; error: MilestonesError | null; stale: boolean };
export function useLoad<T>(fetcher: () => Promise<T>, poll: boolean): { state: LoadState<T>; retry: () => void };
// format.ts
export const utcOf: (iso: string) => Date;
export function shortDate(iso: string, today: string): string;      // "2 Nov", "2 Nov 2027"
export const monthName: (index: number) => string;
export const weekday: (iso: string) => string;                      // "Mon"
export const plural: (n: number, word: string) => string;
// components
export function CopyCommand(props: { command: string }): JSX.Element;
export function MilestoneError(props: { error: MilestonesError; onRetry: () => void }): JSX.Element;
export function MilestoneStatus(props: { status: string; className?: string }): JSX.Element;
export function MilestonesPage(): JSX.Element;
// milestoneFixtures.ts
export const entry, list, epicPlan, detail, stubMilestones  (bodies below)
```

- [ ] **Step 1: `useVisibleInterval` loads once when there is no interval.** In `frontend/src/lib/useVisibleInterval.ts`:
  ```ts
  /** Run `callback` now and, unless `ms` is null, every `ms` while the page is visible and again when it becomes visible. */
  export function useVisibleInterval(callback: () => void, ms: number | null): void {
    useEffect(() => {
      callback();
      if (ms === null) return;
  ```
  The rest of the body is unchanged.
- [ ] **Step 2: Fixtures.** Create `frontend/src/features/milestones/milestoneFixtures.ts`:
  ```ts
  import { vi } from "vitest";
  import { json, project } from "@/features/beads/beadFixtures";
  import type { BeadSummary } from "@/features/beads/api";
  import type { EpicPlan, MilestoneDetail, MilestoneEntry, MilestoneList } from "./api";

  export const entry = (id: string, overrides: Partial<MilestoneEntry> = {}): MilestoneEntry => ({
    id,
    title: `Title ${id}`,
    status: "planned",
    start: "2026-11-02",
    end: "2026-12-18",
    kickoff: null,
    finish: "2026-12-22",
    epics: { total: 6, closed: 0 },
    warnings: 0,
    error: null,
    ...overrides,
  });

  export const list = (milestones: MilestoneEntry[], overrides: Partial<MilestoneList> = {}): MilestoneList => ({
    milestones,
    unassigned_epics: 0,
    today: "2026-10-29",
    ...overrides,
  });

  export const epicPlan = (id: string, overrides: Partial<EpicPlan> = {}): EpicPlan => ({
    id,
    title: `Title ${id}`,
    status: "open",
    estimate_days: 3,
    planned_start: "2026-11-02",
    planned_end: "2026-11-04",
    depends_on: [],
    external_depends_on: [],
    warnings: [],
    ...overrides,
  });

  export const detail = (epics: EpicPlan[], overrides: Partial<MilestoneDetail> = {}): MilestoneDetail => ({
    id: "m-1",
    title: "Beta readiness",
    description: "",
    status: "planned",
    start: "2026-11-02",
    end: "2026-11-13",
    kickoff: null,
    schedule_start: "2026-11-02",
    preview: false,
    today: "2026-10-29",
    finish: "2026-11-04",
    overflow_days: 0,
    epics,
    ...overrides,
  });

  /** Stub `fetch`: `/api/projects` lists "alpha", `/api/milestones…` goes to `handler`, `/api/beads` returns `beads`. */
  export function stubMilestones(handler: (url: URL) => Response | Promise<Response>, beads: BeadSummary[] = []) {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const text = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(text, "http://localhost");
      if (url.pathname === "/api/projects") return Promise.resolve(json([project("alpha")]));
      if (url.pathname.startsWith("/api/milestones")) return Promise.resolve(handler(url));
      if (url.pathname === "/api/beads") return Promise.resolve(json(beads));
      return Promise.resolve(json({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }
  ```
- [ ] **Step 3: Failing client tests.** Create `frontend/src/features/milestones/api.test.ts`:
  ```ts
  import { afterEach, describe, expect, it, vi } from "vitest";
  import { json } from "@/features/beads/beadFixtures";
  import { fetchMilestone, fetchMilestones, milestonePath, MilestonesError } from "./api";
  import { detail, entry, epicPlan, list, stubMilestones } from "./milestoneFixtures";

  afterEach(() => vi.unstubAllGlobals());

  describe("milestones api", () => {
    it("REQ-MILESTONE-UI-001 reads the list of a project", async () => {
      const fetchMock = stubMilestones(() => json(list([entry("m-1")], { unassigned_epics: 4 })));
      expect((await fetchMilestones("al pha")).unassigned_epics).toBe(4);
      expect(String(fetchMock.mock.calls[0][0])).toBe("/api/milestones?project=al%20pha");
    });

    it("REQ-MILESTONE-UI-004 asks a preview with start", async () => {
      const fetchMock = stubMilestones(() => json(detail([epicPlan("e-a")])));
      await fetchMilestone("alpha", "m-1", "2026-11-16");
      expect(String(fetchMock.mock.calls[0][0])).toBe("/api/milestones/alpha/m-1?start=2026-11-16");
    });

    it("REQ-MILESTONE-UI-005 keeps the cause of a 502", async () => {
      stubMilestones(() => json({ error: "no milestone command", cause: "outdated" }, 502));
      const error = await fetchMilestones("alpha").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(MilestonesError);
      expect(error instanceof MilestonesError ? [error.message, error.kind] : []).toEqual(["no milestone command", "outdated"]);
    });

    it("REQ-MILESTONE-UI-008 refuses an unexpected shape", async () => {
      stubMilestones(() => json({ milestones: [{ id: 1 }], unassigned_epics: 0, today: "2026-10-29" }));
      await expect(fetchMilestones("alpha")).rejects.toThrow("unexpected response");
    });

    it("builds milestone paths", () => {
      expect(milestonePath("al pha", "m-1")).toBe("/milestones/al%20pha/m-1");
      expect(milestonePath("alpha", "m-1", "graph", "2026-11-16")).toBe("/milestones/alpha/m-1?tab=graph&start=2026-11-16");
    });
  });
  ```
- [ ] **Step 4: Client.** Create `frontend/src/features/milestones/api.ts`:
  ```ts
  import { field, isFiniteNumber, isString, isStringOrNull } from "@/lib/guards";

  export type Cause = "outdated" | "tracking" | "schema";
  export type MilestoneEntry = {
    id: string;
    title: string;
    status: string;
    start: string;
    end: string;
    kickoff: string | null;
    finish: string | null;
    epics: { total: number; closed: number };
    warnings: number | null;
    error: string | null;
  };
  export type MilestoneList = { milestones: MilestoneEntry[]; unassigned_epics: number; today: string };
  export type EpicWarning = { code: string; days: number | null };
  export type ExternalDependency = { id: string; milestone: string | null };
  export type EpicPlan = {
    id: string;
    title: string;
    status: string;
    estimate_days: number | null;
    planned_start: string;
    planned_end: string;
    depends_on: string[];
    external_depends_on: ExternalDependency[];
    warnings: EpicWarning[];
  };
  export type MilestoneDetail = {
    id: string;
    title: string;
    description: string;
    status: string;
    start: string;
    end: string;
    kickoff: string | null;
    schedule_start: string;
    preview: boolean;
    today: string;
    finish: string | null;
    overflow_days: number;
    epics: EpicPlan[];
  };

  /** A failed milestones request; `kind` names a known cause the page explains with its fix. */
  export class MilestonesError extends Error {
    readonly kind: Cause | null;
    constructor(message: string, kind: Cause | null = null) {
      super(message);
      this.kind = kind;
    }
  }

  const CAUSES: readonly string[] = ["outdated", "tracking", "schema"];
  const isCause = (value: unknown): value is Cause => typeof value === "string" && CAUSES.includes(value);
  const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
  const strings = (value: object, keys: readonly string[]) => keys.every((k) => isString(field(value, k)));
  const stringsOrNull = (value: object, keys: readonly string[]) => keys.every((k) => isStringOrNull(field(value, k)));
  const isNumberOrNull = (value: unknown) => value === null || isFiniteNumber(value);
  const every = (value: unknown, check: (item: unknown) => boolean) => Array.isArray(value) && value.every(check);

  function isEntry(value: unknown): value is MilestoneEntry {
    if (!isObject(value)) return false;
    const epics = field(value, "epics");
    return (
      strings(value, ["id", "title", "status", "start", "end"]) &&
      stringsOrNull(value, ["kickoff", "finish", "error"]) &&
      isNumberOrNull(field(value, "warnings")) &&
      isObject(epics) &&
      isFiniteNumber(field(epics, "total")) &&
      isFiniteNumber(field(epics, "closed"))
    );
  }

  function isList(value: unknown): value is MilestoneList {
    return (
      isObject(value) &&
      every(field(value, "milestones"), isEntry) &&
      isFiniteNumber(field(value, "unassigned_epics")) &&
      isString(field(value, "today"))
    );
  }

  const isWarning = (value: unknown) =>
    isObject(value) && isString(field(value, "code")) && isNumberOrNull(field(value, "days"));
  const isExternal = (value: unknown) =>
    isObject(value) && isString(field(value, "id")) && isStringOrNull(field(value, "milestone"));

  function isEpic(value: unknown): value is EpicPlan {
    return (
      isObject(value) &&
      strings(value, ["id", "title", "status", "planned_start", "planned_end"]) &&
      isNumberOrNull(field(value, "estimate_days")) &&
      every(field(value, "depends_on"), isString) &&
      every(field(value, "external_depends_on"), isExternal) &&
      every(field(value, "warnings"), isWarning)
    );
  }

  function isDetail(value: unknown): value is MilestoneDetail {
    return (
      isObject(value) &&
      strings(value, ["id", "title", "description", "status", "start", "end", "schedule_start", "today"]) &&
      stringsOrNull(value, ["kickoff", "finish"]) &&
      typeof field(value, "preview") === "boolean" &&
      isFiniteNumber(field(value, "overflow_days")) &&
      every(field(value, "epics"), isEpic)
    );
  }

  async function failure(response: Response, what: string): Promise<MilestonesError> {
    if (response.status === 404) return new MilestonesError(`${what} not found`);
    try {
      const body: unknown = await response.json();
      const message = isObject(body) ? field(body, "error") : undefined;
      if (typeof message === "string") {
        const cause = isObject(body) ? field(body, "cause") : null;
        return new MilestonesError(message, isCause(cause) ? cause : null);
      }
    } catch {
      // keep the HTTP status
    }
    return new MilestonesError(`HTTP ${response.status}`);
  }

  const enc = encodeURIComponent;

  export async function fetchMilestones(project: string): Promise<MilestoneList> {
    const response = await fetch(`/api/milestones?project=${enc(project)}`);
    if (!response.ok) throw await failure(response, "Project");
    const body: unknown = await response.json();
    if (!isList(body)) throw new MilestonesError("Could not load milestones (unexpected response)");
    return body;
  }

  export async function fetchMilestone(project: string, id: string, start: string | null): Promise<MilestoneDetail> {
    const query = start === null ? "" : `?start=${enc(start)}`;
    const response = await fetch(`/api/milestones/${enc(project)}/${enc(id)}${query}`);
    if (!response.ok) throw await failure(response, "Milestone");
    const body: unknown = await response.json();
    if (!isDetail(body)) throw new MilestonesError("Could not load the milestone (unexpected response)");
    return body;
  }

  export const milestonesPath = (project: string) => `/milestones?project=${enc(project)}`;

  export function milestonePath(project: string, id: string, tab: "gantt" | "graph" = "gantt", start: string | null = null) {
    const query = new URLSearchParams();
    if (tab === "graph") query.set("tab", "graph");
    if (start !== null) query.set("start", start);
    const search = query.toString();
    return `/milestones/${enc(project)}/${enc(id)}${search === "" ? "" : `?${search}`}`;
  }
  ```
- [ ] **Step 5: Run the client tests.** Run `pnpm -C frontend test --run src/features/milestones/api.test.ts`. Expected: 5 passed.
- [ ] **Step 6: Formatting, hook and small components.** Create `frontend/src/features/milestones/format.ts`:
  ```ts
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

  /** UTC midnight of an ISO date, so the browser's timezone never moves a day. */
  export const utcOf = (iso: string) => new Date(`${iso}T00:00:00Z`);

  /** "2 Nov", with the year when it is not the year of `today` (the JSON's today, never the browser's). */
  export function shortDate(iso: string, today: string): string {
    const day = utcOf(iso);
    const year = iso.slice(0, 4) === today.slice(0, 4) ? "" : ` ${iso.slice(0, 4)}`;
    return `${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]}${year}`;
  }

  export const monthName = (index: number): string => MONTHS[index];
  export const weekday = (iso: string): string => WEEKDAYS[utcOf(iso).getUTCDay()];
  export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  ```
  Create `frontend/src/features/milestones/useLoad.ts`:
  ```ts
  import { useCallback, useRef, useState } from "react";
  import { useVisibleInterval } from "@/lib/useVisibleInterval";
  import { MilestonesError } from "./api";

  export type LoadState<T> =
    | { status: "loading" }
    | { status: "error"; error: MilestonesError }
    | { status: "ok"; data: T; error: MilestonesError | null; stale: boolean };

  const REFRESH_MS = 10_000;
  const asError = (error: unknown) =>
    error instanceof MilestonesError ? error : new MilestonesError(error instanceof Error ? error.message : String(error));

  /**
   * Load with `fetcher` (memoised by the caller), every 10 s while the page is visible when `poll`.
   * A new fetcher marks the last answer `stale` and, if it fails, shows the error instead of that answer;
   * a failed refresh of the same fetcher keeps the last answer with `error` set. A later request always wins.
   */
  export function useLoad<T>(fetcher: () => Promise<T>, poll: boolean): { state: LoadState<T>; retry: () => void } {
    const [state, setState] = useState<LoadState<T>>({ status: "loading" });
    const latest = useRef(0);
    const answered = useRef<(() => Promise<T>) | null>(null);

    const load = useCallback(() => {
      latest.current += 1;
      const id = latest.current;
      const fresh = answered.current !== fetcher;
      if (fresh) setState((prev) => (prev.status === "ok" ? { ...prev, stale: true } : { status: "loading" }));
      void fetcher().then(
        (data) => {
          if (id !== latest.current) return;
          answered.current = fetcher;
          setState({ status: "ok", data, error: null, stale: false });
        },
        (error: unknown) => {
          if (id !== latest.current) return;
          const failed = asError(error);
          setState((prev) => (prev.status === "ok" && !fresh ? { ...prev, error: failed } : { status: "error", error: failed }));
        },
      );
    }, [fetcher]);

    useVisibleInterval(load, poll ? REFRESH_MS : null);

    const retry = () => {
      if (state.status === "error") setState({ status: "loading" });
      load();
    };
    return { state, retry };
  }
  ```
  Create `frontend/src/features/milestones/CopyCommand.tsx`:
  ```tsx
  import { useEffect, useState } from "react";
  import { Button } from "@/components/ui/button";

  /** A command shown in full, with a Copy button that reads "Copied" for 2 s. */
  export function CopyCommand({ command }: { command: string }) {
    const [copied, setCopied] = useState(false);
    useEffect(() => {
      if (!copied) return;
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }, [copied]);
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(command);
        setCopied(true);
      } catch {
        // no clipboard (insecure context) or permission denied: the command stays on screen to select
      }
    };
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <code className="min-w-0 break-all rounded bg-muted px-2 py-1 font-mono text-xs">{command}</code>
        <Button variant="outline" size="sm" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </span>
    );
  }
  ```
  Create `frontend/src/features/milestones/MilestoneError.tsx`:
  ```tsx
  import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
  import { Button } from "@/components/ui/button";
  import type { MilestonesError } from "./api";
  import { CopyCommand } from "./CopyCommand";

  function explain(error: MilestonesError): { title: string; body: string; command: string | null } {
    switch (error.kind) {
      case "outdated":
        return { title: "Milestones need a newer gin-workflow", body: "Run the gin-workflow installer, then reload this page.", command: "gin-workflow/install.sh" };
      case "tracking":
        return {
          title: "This project tracks tasks in markdown",
          body: "Milestones live in Beads. Set providers.task_tracking: beads in the project's gin-workflow config.",
          command: null,
        };
      case "schema":
        return { title: error.message, body: "This console reads schema 1. Update gin-console to read it.", command: null };
      default:
        return { title: "Milestones couldn't be loaded", body: error.message, command: null };
    }
  }

  /** REQ-MILESTONE-UI-005: the cause, and what to do about it. */
  export function MilestoneError({ error, onRetry }: { error: MilestonesError; onRetry: () => void }) {
    const { title, body, command } = explain(error);
    return (
      <Alert variant="destructive">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          <span>{body}</span>
          {command !== null && <CopyCommand command={command} />}
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  ```
  Create `frontend/src/features/milestones/MilestoneStatus.tsx`:
  ```tsx
  import { CalendarClock, Check, CircleDot, Clock } from "lucide-react";
  import { cn } from "@/lib/utils";

  const MARK = {
    planned: { icon: Clock, text: "text-state-deferred", label: "Planned" },
    scheduled: { icon: CalendarClock, text: "text-state-ready", label: "Scheduled" },
    active: { icon: CircleDot, text: "text-state-progress", label: "Active" },
    closed: { icon: Check, text: "text-state-done", label: "Closed" },
  } as const;
  const isKnown = (status: string): status is keyof typeof MARK => Object.hasOwn(MARK, status);

  /** A milestone status as an icon and a word, never colour alone. */
  export function MilestoneStatus({ status, className }: { status: string; className?: string }) {
    const mark = isKnown(status) ? MARK[status] : { icon: Clock, text: "text-muted-foreground", label: status };
    const Icon = mark.icon;
    return (
      <span data-status={status} className={cn("inline-flex items-center gap-1 text-sm font-medium", mark.text, className)}>
        <Icon aria-hidden className="size-3.5" />
        {mark.label}
      </span>
    );
  }
  ```
- [ ] **Step 7: Failing page tests.** Create `frontend/src/features/milestones/MilestonesPage.test.tsx`:
  ```tsx
  import { cleanup, render, screen, within } from "@testing-library/react";
  import { afterEach, describe, expect, it, vi } from "vitest";
  import { json } from "@/features/beads/beadFixtures";
  import { entry, list, stubMilestones } from "./milestoneFixtures";
  import { MilestonesPage } from "./MilestonesPage";

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function open(body: Response) {
    window.history.replaceState(null, "", "/milestones?project=alpha");
    stubMilestones(() => body);
    render(<MilestonesPage />);
  }
  const rowOf = async (title: string) => (await screen.findByRole("link", { name: title })).closest("li") ?? document.body;

  describe("MilestonesPage", () => {
    it("REQ-MILESTONE-UI-001 lists milestones with status, period, progress and warnings", async () => {
      open(
        json(
          list([
            entry("m-2", { title: "Hardening", status: "planned", start: "2026-12-01", end: "2026-12-18", warnings: 0 }),
            entry("m-1", { title: "Beta", status: "active", kickoff: "2026-11-02", epics: { total: 6, closed: 2 }, warnings: 2 }),
          ]),
        ),
      );
      const beta = await rowOf("Beta");
      expect(within(beta).getByText("Active")).toBeInTheDocument();
      expect(beta).toHaveTextContent("Kicks off 2 Nov");
      expect(beta).toHaveTextContent("2 Nov – 18 Dec");
      expect(beta).toHaveTextContent("2 of 6");
      expect(beta).toHaveTextContent("2 warnings");
      const hardening = await rowOf("Hardening");
      expect(within(hardening).getByText("Planned")).toBeInTheDocument();
      expect(hardening).toHaveTextContent("None");
      const titles = screen.getAllByRole("link").map((a) => a.textContent);
      expect(titles.indexOf("Beta")).toBeLessThan(titles.indexOf("Hardening"));
      expect(screen.getByRole("link", { name: "Beta" })).toHaveAttribute("href", "/milestones/alpha/m-1");
    });

    it("REQ-MILESTONE-UI-001 shows the epics not yet in a milestone", async () => {
      open(json(list([entry("m-1")], { unassigned_epics: 4 })));
      expect(await screen.findByText(/4 roadmap epics aren't in a milestone yet/)).toBeInTheDocument();
    });

    it("REQ-MILESTONE-UI-001 shows a list entry's error in place of progress and warnings", async () => {
      open(
        json(
          list([
            entry("m-1", { title: "Beta" }),
            entry("m-2", { title: "Hardening", error: "dependency cycle: A -> B -> A", warnings: null, finish: null }),
          ]),
        ),
      );
      const hardening = await rowOf("Hardening");
      expect(hardening).toHaveTextContent("dependency cycle: A -> B -> A");
      expect(within(hardening).queryByRole("progressbar")).toBeNull();
      expect(within(await rowOf("Beta")).getByRole("progressbar")).toBeInTheDocument();
    });

    it("REQ-MILESTONE-UI-001 an empty project says how to create a milestone", async () => {
      open(json(list([])));
      expect(await screen.findByText(/No milestones in alpha yet/)).toBeInTheDocument();
      expect(screen.getByText(/gin-workflow milestone create/)).toBeInTheDocument();
    });

    it("REQ-MILESTONE-UI-005 old gin-workflow: says to run the installer", async () => {
      open(json({ error: "this gin-workflow has no milestone command", cause: "outdated" }, 502));
      expect(await screen.findByText("Milestones need a newer gin-workflow")).toBeInTheDocument();
      expect(screen.getByText("gin-workflow/install.sh")).toBeInTheDocument();
    });

    it("REQ-MILESTONE-UI-005 markdown tracking: says milestones need Beads", async () => {
      open(json({ error: "milestones need providers.task_tracking: beads", cause: "tracking" }, 502));
      expect(await screen.findByText("This project tracks tasks in markdown")).toBeInTheDocument();
      expect(screen.getByText(/providers\.task_tracking: beads/)).toBeInTheDocument();
    });

    it("REQ-MILESTONE-UI-005 unknown schema: names it and lists nothing", async () => {
      open(json({ error: "gin-workflow reports milestone schema 2", cause: "schema" }, 502));
      expect(await screen.findByText("gin-workflow reports milestone schema 2")).toBeInTheDocument();
      expect(screen.queryByRole("list", { name: "Milestones" })).toBeNull();
    });
  });
  ```
- [ ] **Step 8: Run them.** Run `pnpm -C frontend test --run src/features/milestones/MilestonesPage.test.tsx`. Expected: it fails to import `./MilestonesPage`.
- [ ] **Step 9: Page.** Create `frontend/src/features/milestones/MilestonesPage.tsx`:
  ```tsx
  import { TriangleAlert } from "lucide-react";
  import { useCallback, useEffect, useState } from "react";
  import { Link } from "@/app/Link";
  import { navigate, useLocation } from "@/app/route";
  import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
  import { fetchProjects, type Project } from "@/features/projects/api";
  import { cn } from "@/lib/utils";
  import { fetchMilestones, milestonePath, milestonesPath, type MilestoneEntry } from "./api";
  import { CopyCommand } from "./CopyCommand";
  import { plural, shortDate } from "./format";
  import { MilestoneError } from "./MilestoneError";
  import { MilestoneStatus } from "./MilestoneStatus";
  import { useLoad } from "./useLoad";

  type Projects = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; names: string[] };

  const ORDER = ["active", "scheduled", "planned", "closed"];
  const rank = (status: string) => (ORDER.includes(status) ? ORDER.indexOf(status) : ORDER.length);
  const COLUMNS = "md:grid-cols-[8rem_minmax(0,1fr)_11rem_9rem_7rem]";

  export function MilestonesPage() {
    const [projects, setProjects] = useState<Projects>({ status: "loading" });
    const { search } = useLocation();
    const asked = new URLSearchParams(search).get("project") ?? "";

    useEffect(() => {
      void fetchProjects().then(
        (list: Project[]) => setProjects({ status: "ok", names: list.filter((p) => p.exists).map((p) => p.name) }),
        (error: unknown) => setProjects({ status: "error", message: error instanceof Error ? error.message : String(error) }),
      );
    }, []);

    const names = projects.status === "ok" ? projects.names : [];
    // the default is not written back into the URL, as on the Beads page
    const selected = names.includes(asked) ? asked : (names[0] ?? "");

    return (
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Milestones</h1>
          {names.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              Project
              <select
                value={selected}
                onChange={(event) => navigate(milestonesPath(event.target.value), { replace: true })}
                className="rounded border bg-background px-2 py-1"
              >
                {names.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {projects.status === "loading" && <p className="text-muted-foreground">Loading projects…</p>}
        {projects.status === "error" && (
          <Alert variant="destructive">
            <AlertTitle>Projects could not be loaded</AlertTitle>
            <AlertDescription>{projects.message}</AlertDescription>
          </Alert>
        )}
        {projects.status === "ok" && names.length === 0 && <p className="text-muted-foreground">No projects configured.</p>}
        {selected !== "" && <MilestoneTable key={selected} project={selected} />}
      </section>
    );
  }

  function MilestoneTable({ project }: { project: string }) {
    const fetcher = useCallback(() => fetchMilestones(project), [project]);
    const { state, retry } = useLoad(fetcher, true);
    if (state.status === "loading") return <p className="text-muted-foreground">Loading milestones…</p>;
    if (state.status === "error") return <MilestoneError error={state.error} onRetry={retry} />;
    const { milestones, unassigned_epics: unassigned, today } = state.data;
    const rows = [...milestones].sort((a, b) => rank(a.status) - rank(b.status) || a.start.localeCompare(b.start));
    return (
      <div className="flex flex-col gap-3">
        {state.error !== null && <p role="status" className="text-sm text-destructive">{`Refresh failed: ${state.error.message}`}</p>}
        {unassigned > 0 && (
          <p className="text-sm">
            {`${plural(unassigned, "roadmap epic")} ${unassigned === 1 ? "isn't" : "aren't"} in a milestone yet. Add them with /roadmap --milestone <id>.`}
          </p>
        )}
        {rows.length === 0 ? (
          <div className="flex flex-col items-start gap-2 text-sm">
            <p>{`No milestones in ${project} yet. Create one with:`}</p>
            <CopyCommand command={'gin-workflow milestone create "<title>" --start <date> --end <date>'} />
          </div>
        ) : (
          <ul aria-label="Milestones" className="flex flex-col divide-y rounded border bg-card">
            <li aria-hidden className={cn("hidden gap-3 px-3 py-2 text-sm text-muted-foreground md:grid", COLUMNS)}>
              <span>Status</span>
              <span>Milestone</span>
              <span>Period</span>
              <span>Epics</span>
              <span>Warnings</span>
            </li>
            {rows.map((m) => (
              <Row key={m.id} project={project} milestone={m} today={today} />
            ))}
          </ul>
        )}
      </div>
    );
  }

  function Row({ project, milestone: m, today }: { project: string; milestone: MilestoneEntry; today: string }) {
    const date = (iso: string) => shortDate(iso, today);
    const warnings = m.warnings ?? 0;
    const percent = m.epics.total === 0 ? 0 : (100 * m.epics.closed) / m.epics.total;
    return (
      <li
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2",
          COLUMNS,
          m.status === "closed" && "text-muted-foreground",
        )}
      >
        <MilestoneStatus status={m.status} />
        <span className="flex min-w-0 items-baseline gap-2">
          <Link to={milestonePath(project, m.id)} className="truncate font-medium underline-offset-2 hover:underline">
            {m.title}
          </Link>
          <span className="font-mono text-xs text-muted-foreground">{m.id}</span>
        </span>
        <span className="flex flex-col text-sm">
          {m.kickoff !== null && <span>{`Kicks off ${date(m.kickoff)}`}</span>}
          <span className={cn(m.kickoff !== null && "text-muted-foreground")}>{`${date(m.start)} – ${date(m.end)}`}</span>
        </span>
        {m.error !== null ? (
          <span className="col-span-2 text-sm text-destructive">{m.error}</span>
        ) : (
          <>
            <span className="flex items-center gap-2 text-sm tabular-nums">
              <span
                role="progressbar"
                aria-label={`Epics closed in ${m.title}`}
                aria-valuemin={0}
                aria-valuemax={m.epics.total}
                aria-valuenow={m.epics.closed}
                className="h-1.5 w-16 overflow-hidden rounded bg-muted"
              >
                <span className="block h-full bg-state-done" style={{ width: `${percent}%` }} />
              </span>
              {`${m.epics.closed} of ${m.epics.total}`}
            </span>
            {warnings > 0 ? (
              <span className="inline-flex items-center gap-1 text-sm text-state-blocked">
                <TriangleAlert aria-hidden className="size-3.5" />
                {plural(warnings, "warning")}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">None</span>
            )}
          </>
        )}
      </li>
    );
  }
  ```
- [ ] **Step 10: Run the page tests.** Run the Step 8 command. Expected: 7 passed.
- [ ] **Step 11: Navigation and route.**

  `Layout.test.tsx`:
  - Change the first test's name to `"REQ-UI-055 has one Main navigation with the five links"`.
  - Change its expected list to `[["Projects", "/"], ["Beads", "/beads"], ["Milestones", "/milestones"], ["Sessions", "/sessions"], ["Quota", "/quota"]]`.
  - Add these rows to the `it.each` table: `["/milestones", ["Milestones"]]`, `["/milestones/alpha/m-1", ["Milestones"]]` and `["/milestonesx", []]`.

  In `Layout.tsx`, import `Flag` from `lucide-react` and insert after the Beads entry:
  ```ts
    { to: "/milestones", label: "Milestones", icon: Flag, current: (path: string) => path === "/milestones" || path.startsWith("/milestones/") },
  ```
  In `App.test.tsx`, add inside `describe("App routing", ...)`:
  ```tsx
    // REQ-UI-055
    it("REQ-UI-055 opens Milestones from the sidebar without a reload", async () => {
      window.history.replaceState(null, "", "/");
      vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
      render(<App />);
      await screen.findByText(/no projects configured/i);
      await userEvent.click(screen.getByRole("link", { name: "Milestones" }));
      expect(window.location.pathname).toBe("/milestones");
      expect(await screen.findByRole("heading", { name: "Milestones" })).toBeInTheDocument();
    });
  ```
  In `App.tsx`, import `MilestonesPage` from `@/features/milestones/MilestonesPage` and add a branch after the `/beads` branch:
  ```tsx
        ) : pathname === "/milestones" ? (
          <MilestonesPage />
  ```
  In `README.md`, add after the Beads bullet:
  ```markdown
  - **Milestones**: Dated milestones per project with a Gantt of the working-day schedule, a dependency graph per milestone, and a read-only kick-start preview (needs a gin-workflow with the `milestone` command and Beads task tracking).
  ```
- [ ] **Step 12: Verify.** Run the frontend verify commands. Expected: all pass, including the updated Layout and App tests.

---

### Track 5: Milestone page with Gantt and kick-start preview
- **Dependencies**: Track 4
- **Requirements**: REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-004
- **Files**:
  - Create `frontend/src/features/milestones/gantt.ts`
  - Create `frontend/src/features/milestones/GanttChart.tsx`
  - Create `frontend/src/features/milestones/GanttTab.tsx`
  - Create `frontend/src/features/milestones/MilestonePage.tsx`
  - Test `frontend/src/features/milestones/gantt.test.ts`
  - Test `frontend/src/features/milestones/MilestonePage.test.tsx`
  - Modify `frontend/src/app/App.tsx` (route `/milestones/<project>/<id>`)
  - Test `frontend/src/app/App.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** bounded to one folder with a full spec, but the work is intricate: calendar arithmetic over weekends and timezones, pixel geometry, and the preview's loading, stale and failure states.
- **Acceptance criteria**:
  - The REQ-MILESTONE-UI-003 and -004 scenarios pass.
  - Bars skip weekends.
  - The today line comes from the JSON whatever the browser's clock says.
  - A failed preview shows no bars.
  - Reset returns to the current plan.
- **Estimated complexity**: high

**Interfaces produced** (used by Track 6):
```ts
// gantt.ts
export const WEEKEND_WIDTH = 8;
export const dayOf: (iso: string) => number;          // whole UTC days since 1970-01-01
export const isoOf: (day: number) => string;
export const isWeekend: (day: number) => boolean;
export type Column = { day: number; iso: string; weekend: boolean; x: number; width: number };
export type Axis = { first: number; last: number; columns: Column[]; width: number };
export function axisOf(plan: MilestoneDetail, dayWidth: number): Axis;
export const xOf: (axis: Axis, day: number) => number;        // left edge, 0 outside
export const endOf: (axis: Axis, day: number) => number;      // right edge, 0 outside
export const middleOf: (axis: Axis, day: number) => number | null;
export function beadsOf(epic: EpicPlan): number[];
export function sortEpics(epics: readonly EpicPlan[]): EpicPlan[];
export type Month = { key: string; label: string; x: number; width: number };
export function monthsOf(axis: Axis, today: string): Month[];
export function warningLines(epic: EpicPlan, today: string): string[];
export function periodOf(from: string, to: string, today: string): string;
// components
export function GanttChart(props: { project: string; plan: MilestoneDetail; preview: boolean; busy: boolean }): JSX.Element;
export function GanttTab(props: { project: string; plan: MilestoneDetail; start: string | null;
  preview: LoadState<MilestoneDetail | null>; onRetryPreview: () => void; onStart: (date: string | null) => void }): JSX.Element;
export function MilestonePage(props: { project: string; id: string }): JSX.Element;
// MilestonePage.tsx also exports, for Track 6:
export function MilestoneHeader(props: { project: string; plan: MilestoneDetail }): JSX.Element;
```

- [ ] **Step 1: Failing date-math tests.** Create `frontend/src/features/milestones/gantt.test.ts`:
  ```ts
  import { describe, expect, it } from "vitest";
  import { axisOf, beadsOf, dayOf, endOf, isoOf, middleOf, monthsOf, sortEpics, warningLines, xOf } from "./gantt";
  import { detail, epicPlan } from "./milestoneFixtures";

  const days = (epic: Parameters<typeof beadsOf>[0]) => beadsOf(epic).map(isoOf);

  describe("gantt", () => {
    it("REQ-MILESTONE-UI-003 one column per day, weekends narrow", () => {
      const axis = axisOf(detail([epicPlan("a")]), 28); // 2026-11-02 (Mon) to 2026-11-13 (Fri)
      expect(axis.columns).toHaveLength(12);
      expect(axis.columns.filter((c) => c.weekend).map((c) => c.iso)).toEqual(["2026-11-07", "2026-11-08"]);
      expect(axis.width).toBe(10 * 28 + 2 * 8);
      expect(xOf(axis, dayOf("2026-11-09"))).toBe(5 * 28 + 2 * 8);
      expect(endOf(axis, dayOf("2026-11-04"))).toBe(3 * 28);
      expect(middleOf(axis, dayOf("2026-11-04"))).toBe(2 * 28 + 14);
      expect(middleOf(axis, dayOf("2026-12-25"))).toBeNull();
    });

    it("REQ-MILESTONE-UI-003 the axis reaches the latest epic, finish and schedule start", () => {
      const plan = detail([epicPlan("a", { planned_start: "2026-11-16", planned_end: "2026-11-20" })], {
        schedule_start: "2026-11-16",
        finish: "2026-11-20",
      });
      const axis = axisOf(plan, 20);
      expect([isoOf(axis.first), isoOf(axis.last)]).toEqual(["2026-11-02", "2026-11-20"]);
    });

    it("REQ-MILESTONE-UI-003 one bead per working day; weekend skipped; unestimated is one bead", () => {
      expect(days(epicPlan("a", { planned_start: "2026-11-02", planned_end: "2026-11-04" }))).toEqual([
        "2026-11-02",
        "2026-11-03",
        "2026-11-04",
      ]);
      expect(days(epicPlan("a", { planned_start: "2026-11-05", planned_end: "2026-11-09" }))).toEqual([
        "2026-11-05",
        "2026-11-06",
        "2026-11-09",
      ]);
      expect(days(epicPlan("u", { estimate_days: null, planned_start: "2026-11-02", planned_end: "2026-11-02" }))).toEqual([
        "2026-11-02",
      ]);
    });

    it("REQ-MILESTONE-UI-003 dates do not move with the browser's timezone", () => {
      expect(isoOf(dayOf("2026-03-29"))).toBe("2026-03-29");
      expect(dayOf("2026-11-03") - dayOf("2026-11-02")).toBe(1);
    });

    it("REQ-MILESTONE-UI-003 warnings read as sentences", () => {
      const today = "2026-10-29";
      expect(warningLines(epicPlan("a", { warnings: [{ code: "overflow", days: 2 }] }), today)).toEqual([
        "2 working days past the end",
      ]);
      expect(warningLines(epicPlan("a", { warnings: [{ code: "overflow", days: 1 }] }), today)).toEqual([
        "1 working day past the end",
      ]);
      expect(warningLines(epicPlan("a", { warnings: [{ code: "late", days: null }] }), today)).toEqual([
        "Late: should have finished 4 Nov",
      ]);
      expect(warningLines(epicPlan("a", { warnings: [{ code: "unestimated", days: null }] }), today)).toEqual(["No estimate"]);
      const blocked = epicPlan("a", {
        warnings: [{ code: "external_blocker", days: null }],
        external_depends_on: [
          { id: "E9", milestone: "M2" },
          { id: "X1", milestone: null },
        ],
      });
      expect(warningLines(blocked, today)).toEqual(["Blocked by E9 (in M2)", "Blocked by X1 (not in a milestone)"]);
    });

    it("REQ-MILESTONE-UI-003 months and row order", () => {
      const plan = detail([epicPlan("b", { planned_start: "2026-11-03" }), epicPlan("a")], {
        schedule_start: "2026-10-29",
        start: "2026-10-29",
      });
      expect(monthsOf(axisOf(plan, 28), "2026-10-29").map((m) => m.label)).toEqual(["Oct", "Nov"]);
      expect(sortEpics(plan.epics).map((e) => e.id)).toEqual(["a", "b"]);
    });
  });
  ```
- [ ] **Step 2: Run them.** Run `pnpm -C frontend test --run src/features/milestones/gantt.test.ts`. Expected: it fails to import `./gantt`.
- [ ] **Step 3: Date math.** Create `frontend/src/features/milestones/gantt.ts`:
  ```ts
  import type { EpicPlan, MilestoneDetail } from "./api";
  import { monthName, shortDate, utcOf } from "./format";

  const DAY_MS = 86_400_000;
  export const WEEKEND_WIDTH = 8;

  /** Whole UTC days since 1970-01-01. */
  export const dayOf = (iso: string) => Math.round(utcOf(iso).getTime() / DAY_MS);
  export const isoOf = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);
  export const isWeekend = (day: number) => {
    const weekday = new Date(day * DAY_MS).getUTCDay();
    return weekday === 0 || weekday === 6;
  };

  export type Column = { day: number; iso: string; weekend: boolean; x: number; width: number };
  export type Axis = { first: number; last: number; columns: Column[]; width: number };

  /** One column per calendar day over the milestone, its schedule and every epic; weekend columns are narrow. */
  export function axisOf(plan: MilestoneDetail, dayWidth: number): Axis {
    const days = [
      plan.schedule_start,
      plan.start,
      plan.end,
      ...(plan.finish === null ? [] : [plan.finish]),
      ...plan.epics.flatMap((e) => [e.planned_start, e.planned_end]),
    ].map(dayOf);
    const first = Math.min(...days);
    const last = Math.max(...days);
    const columns: Column[] = [];
    let x = 0;
    for (let day = first; day <= last; day += 1) {
      const weekend = isWeekend(day);
      const width = weekend ? WEEKEND_WIDTH : dayWidth;
      columns.push({ day, iso: isoOf(day), weekend, x, width });
      x += width;
    }
    return { first, last, columns, width: x };
  }

  const columnOf = (axis: Axis, day: number): Column | undefined => axis.columns[day - axis.first];
  export const xOf = (axis: Axis, day: number) => columnOf(axis, day)?.x ?? 0;
  export const endOf = (axis: Axis, day: number) => {
    const c = columnOf(axis, day);
    return c === undefined ? 0 : c.x + c.width;
  };
  export const middleOf = (axis: Axis, day: number): number | null => {
    const c = columnOf(axis, day);
    return c === undefined ? null : c.x + c.width / 2;
  };

  /** The working days of an epic, one bead each; an epic without a working day is one bead on its start. */
  export function beadsOf(epic: EpicPlan): number[] {
    const days: number[] = [];
    for (let day = dayOf(epic.planned_start); day <= dayOf(epic.planned_end); day += 1) {
      if (!isWeekend(day)) days.push(day);
    }
    return days.length > 0 ? days : [dayOf(epic.planned_start)];
  }

  export const sortEpics = (epics: readonly EpicPlan[]) =>
    [...epics].sort(
      (a, b) => a.planned_start.localeCompare(b.planned_start) || a.planned_end.localeCompare(b.planned_end) || a.id.localeCompare(b.id),
    );

  export type Month = { key: string; label: string; x: number; width: number };

  export function monthsOf(axis: Axis, today: string): Month[] {
    const months: Month[] = [];
    for (const c of axis.columns) {
      const key = c.iso.slice(0, 7);
      const last = months.at(-1);
      if (last?.key === key) {
        last.width += c.width;
      } else {
        const year = key.slice(0, 4) === today.slice(0, 4) ? "" : ` ${key.slice(0, 4)}`;
        months.push({ key, label: `${monthName(Number(key.slice(5)) - 1)}${year}`, x: c.x, width: c.width });
      }
    }
    return months;
  }

  export function warningLines(epic: EpicPlan, today: string): string[] {
    return epic.warnings.flatMap((w) => {
      switch (w.code) {
        case "overflow":
          return [`${w.days ?? 0} working ${w.days === 1 ? "day" : "days"} past the end`];
        case "late":
          return [`Late: should have finished ${shortDate(epic.planned_end, today)}`];
        case "unestimated":
          return ["No estimate"];
        case "external_blocker":
          return epic.external_depends_on.map(
            (d) => `Blocked by ${d.id} (${d.milestone === null ? "not in a milestone" : `in ${d.milestone}`})`,
          );
        default:
          return [w.code];
      }
    });
  }

  export const periodOf = (from: string, to: string, today: string) =>
    from === to ? shortDate(from, today) : `${shortDate(from, today)} – ${shortDate(to, today)}`;
  ```
- [ ] **Step 4: Run them again.** Run the Step 2 command. Expected: 6 passed.
- [ ] **Step 5: Failing page tests.** In jsdom `matchMedia` is missing, so `useWide` returns true: days are 28px wide and the label column is 256px. Create `frontend/src/features/milestones/MilestonePage.test.tsx`:
  ```tsx
  import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
  import userEvent from "@testing-library/user-event";
  import { afterEach, describe, expect, it, vi } from "vitest";
  import { json } from "@/features/beads/beadFixtures";
  import type { MilestoneDetail } from "./api";
  import { detail, epicPlan, stubMilestones } from "./milestoneFixtures";
  import { MilestonePage } from "./MilestonePage";

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function open(current: MilestoneDetail, preview: (start: string) => Response = (start) => json({ ...current, schedule_start: start, preview: true }), search = "") {
    window.history.replaceState(null, "", `/milestones/alpha/m-1${search}`);
    const fetchMock = stubMilestones((url) => {
      const start = url.searchParams.get("start");
      return start === null ? json(current) : preview(start);
    });
    render(<MilestonePage project="alpha" id="m-1" />);
    return fetchMock;
  }
  const row = async (id: string) => (await screen.findByRole("link", { name: id })).closest("li") ?? document.body;
  const beads = (li: HTMLElement) => [...li.querySelectorAll("[data-bead]")].map((b) => b.getAttribute("data-bead"));
  const line = (name: string) => document.querySelector<HTMLElement>(`[data-line="${name}"]`);

  const OVERFLOW = detail(
    [
      epicPlan("e-a", {
        planned_start: "2026-11-02",
        planned_end: "2026-11-06",
        estimate_days: 5,
        warnings: [{ code: "overflow", days: 2 }],
      }),
    ],
    { end: "2026-11-04", finish: "2026-11-06", overflow_days: 2, today: "2026-11-04" },
  );

  describe("MilestonePage", () => {
    it("REQ-MILESTONE-UI-003 header states the outcome", async () => {
      open(OVERFLOW);
      expect(await screen.findByRole("heading", { name: "Beta readiness" })).toBeInTheDocument();
      expect(screen.getByText("Finishes 6 Nov, 2 working days past the end")).toBeInTheDocument();
    });

    it("REQ-MILESTONE-UI-003 overflow shown: the bar runs past the end line with its warning", async () => {
      open(OVERFLOW);
      const a = await row("e-a");
      expect(beads(a)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]);
      expect(a).toHaveTextContent("2 working days past the end");
      expect(line("end")?.style.left).toBe(`${256 + 3 * 28}px`);
    });

    it("REQ-MILESTONE-UI-003 today from the JSON, whatever the browser's date", async () => {
      vi.useFakeTimers({ toFake: ["Date"], now: new Date("2030-01-01T12:00:00Z") });
      try {
        open(OVERFLOW);
        await row("e-a");
        expect(line("today")?.style.left).toBe(`${256 + 2 * 28 + 14}px`);
      } finally {
        vi.useRealTimers();
      }
    });

    it("REQ-MILESTONE-UI-003 external blocker named", async () => {
      open(
        detail([
          epicPlan("e-a", {
            warnings: [{ code: "external_blocker", days: null }],
            external_depends_on: [{ id: "E9", milestone: "M2" }],
          }),
        ]),
      );
      expect(await row("e-a")).toHaveTextContent("Blocked by E9 (in M2)");
    });

    it("REQ-MILESTONE-UI-003 weekend skipped", async () => {
      open(detail([epicPlan("e-a", { planned_start: "2026-11-05", planned_end: "2026-11-09" })], { finish: "2026-11-09" }));
      expect(beads(await row("e-a"))).toEqual(["2026-11-05", "2026-11-06", "2026-11-09"]);
    });

    it("REQ-MILESTONE-UI-004 preview: picker defaults to kickoff, redraws from the picked date with the command", async () => {
      const fetchMock = open(detail([epicPlan("e-a")], { status: "scheduled", kickoff: "2026-11-09" }), (start) =>
        json(detail([epicPlan("e-a", { planned_start: "2026-11-16", planned_end: "2026-11-18" })], { status: "scheduled", schedule_start: start, preview: true, finish: "2026-11-18" })),
      );
      const picker = await screen.findByLabelText("Kick-start date");
      expect(picker).toHaveValue("2026-11-09");
      fireEvent.change(picker, { target: { value: "2026-11-16" } });
      await waitFor(() => expect(beads(document.querySelector("[data-epic='e-a']") ?? document.body)[0]).toBe("2026-11-16"));
      expect(screen.getByText(/Preview from Mon 16 Nov\. Nothing changes until you run:/)).toBeInTheDocument();
      expect(screen.getByText("gin-workflow milestone kickstart m-1 --date 2026-11-16")).toBeInTheDocument();
      expect(window.location.search).toBe("?start=2026-11-16");
      expect(fetchMock.mock.calls.some(([input]) => String(input).includes("start=2026-11-16"))).toBe(true);
    });

    it("REQ-MILESTONE-UI-004 Reset returns to the current plan", async () => {
      open(detail([epicPlan("e-a")]), undefined, "?start=2026-11-16");
      await userEvent.click(await screen.findByRole("button", { name: "Reset" }));
      expect(window.location.search).toBe("");
      await waitFor(() => expect(screen.queryByText(/Preview from/)).toBeNull());
    });

    it.each(["active", "closed"])("REQ-MILESTONE-UI-004 %s milestone: no picker", async (status) => {
      open(detail([epicPlan("e-a")], { status }));
      await row("e-a");
      expect(screen.queryByLabelText("Kick-start date")).toBeNull();
    });

    it("REQ-MILESTONE-UI-004 preview fails: the error and no bars", async () => {
      open(detail([epicPlan("e-a")]), () => json({ error: "dependency cycle: A -> B -> A", cause: null }, 502));
      fireEvent.change(await screen.findByLabelText("Kick-start date"), { target: { value: "2026-11-16" } });
      expect(await screen.findByText("dependency cycle: A -> B -> A")).toBeInTheDocument();
      expect(document.querySelectorAll("[data-bead]")).toHaveLength(0);
      expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    });

    it("REQ-MILESTONE-UI-005 a milestone that cannot be read names the cause", async () => {
      window.history.replaceState(null, "", "/milestones/alpha/m-1");
      stubMilestones(() => json({ error: "milestones need providers.task_tracking: beads", cause: "tracking" }, 502));
      render(<MilestonePage project="alpha" id="m-1" />);
      expect(await screen.findByText("This project tracks tasks in markdown")).toBeInTheDocument();
    });

    it("REQ-MILESTONE-UI-003 an empty milestone says how to add epics", async () => {
      open(detail([], { finish: null }));
      expect(await screen.findByText(/No epics in this milestone/)).toBeInTheDocument();
      expect(within(document.body).getByText("/roadmap --milestone m-1")).toBeInTheDocument();
    });
  });
  ```
- [ ] **Step 6: Run them.** Run `pnpm -C frontend test --run src/features/milestones/MilestonePage.test.tsx`. Expected: it fails to import `./MilestonePage`.
- [ ] **Step 7: Chart.** Create `frontend/src/features/milestones/GanttChart.tsx`:
  ```tsx
  import { Ban, Check, Circle, CircleDot, Clock, TriangleAlert } from "lucide-react";
  import { useLayoutEffect, useRef } from "react";
  import { Link } from "@/app/Link";
  import { useWide } from "@/features/beads/useWide";
  import { cn } from "@/lib/utils";
  import type { EpicPlan, MilestoneDetail } from "./api";
  import { CopyCommand } from "./CopyCommand";
  import { shortDate } from "./format";
  import { axisOf, beadsOf, dayOf, endOf, isoOf, middleOf, monthsOf, periodOf, sortEpics, warningLines, xOf, type Axis } from "./gantt";

  const LOOK = {
    open: { icon: Circle, label: "Open", text: "text-muted-foreground", fill: "border border-muted-foreground bg-card" },
    in_progress: { icon: CircleDot, label: "In progress", text: "text-state-progress", fill: "bg-state-progress" },
    blocked: { icon: Ban, label: "Blocked", text: "text-state-blocked", fill: "bg-state-blocked" },
    closed: { icon: Check, label: "Closed", text: "text-state-done", fill: "bg-state-done opacity-60" },
    deferred: {
      icon: Clock,
      label: "Deferred",
      text: "text-state-deferred",
      fill: "border border-state-deferred bg-[repeating-linear-gradient(135deg,var(--state-deferred)_0_2px,transparent_2px_5px)]",
    },
  } as const;
  const isLook = (status: string): status is keyof typeof LOOK => Object.hasOwn(LOOK, status);
  const lookOf = (status: string) => (isLook(status) ? LOOK[status] : LOOK.open);
  const enc = encodeURIComponent;

  /** REQ-MILESTONE-UI-003: each epic as beads on a thread, one bead per working day; weekends narrow. */
  export function GanttChart({ project, plan, preview, busy }: { project: string; plan: MilestoneDetail; preview: boolean; busy: boolean }) {
    const wide = useWide();
    const label = wide ? 256 : 160;
    const axis = axisOf(plan, wide ? 28 : 20);
    const scroller = useRef<HTMLDivElement>(null);
    const todayX = middleOf(axis, dayOf(plan.today));
    const endX = endOf(axis, dayOf(plan.end));

    // opens at today when today is in range; a refresh or a preview keeps the user's scroll
    useLayoutEffect(() => {
      const el = scroller.current;
      if (el !== null && todayX !== null) el.scrollLeft = Math.max(0, todayX - el.clientWidth / 3);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plan.id]);

    if (plan.epics.length === 0) {
      return (
        <div className="flex flex-col items-start gap-2 text-sm">
          <p>No epics in this milestone. Add some with:</p>
          <CopyCommand command={`/roadmap --milestone ${plan.id}`} />
        </div>
      );
    }
    return (
      <figure aria-label="Schedule" aria-busy={busy} className={cn("flex flex-col gap-2 rounded border bg-card", preview && "border-dashed", busy && "opacity-60")}>
        <div ref={scroller} className="overflow-x-auto">
          <div className="relative" style={{ width: label + axis.width }}>
            <div aria-hidden className="absolute inset-y-0" style={{ left: label }}>
              {axis.columns
                .filter((c) => c.weekend)
                .map((c) => (
                  <span key={c.day} className="absolute inset-y-0 bg-muted" style={{ left: c.x, width: c.width }} />
                ))}
              <span className="absolute inset-y-0 bg-state-blocked/5" style={{ left: endX, width: Math.max(0, axis.width - endX) }} />
            </div>
            <Header axis={axis} label={label} today={plan.today} />
            <ol aria-label="Epics" className="relative">
              {sortEpics(plan.epics).map((epic) => (
                <EpicRow key={epic.id} project={project} epic={epic} axis={axis} label={label} today={plan.today} />
              ))}
            </ol>
            {todayX !== null && (
              <div data-line="today" aria-hidden className="absolute inset-y-0 z-[5] border-l border-dashed border-foreground" style={{ left: label + todayX }}>
                <span className="absolute top-0 ml-1 rounded bg-foreground px-1 text-[11px] text-background">Today</span>
              </div>
            )}
            <div data-line="end" aria-hidden className="absolute inset-y-0 z-[5] border-l-2 border-foreground" style={{ left: label + endX }}>
              <span className="absolute top-5 ml-1 whitespace-nowrap text-[11px] font-medium">{`End ${shortDate(plan.end, plan.today)}`}</span>
            </div>
          </div>
        </div>
        <ul aria-label="Legend" className="flex flex-wrap gap-x-4 gap-y-1 px-3 pb-2 text-xs text-muted-foreground">
          {Object.values(LOOK).map((look) => (
            <li key={look.label} className="flex items-center gap-1.5">
              <span aria-hidden className={cn("h-3 w-5 rounded-full", look.fill)} />
              {look.label}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 border-l border-dashed border-foreground" />
            Today
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 border-l-2 border-foreground" />
            End
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-5 bg-state-blocked/10" />
            Past the end
          </li>
        </ul>
      </figure>
    );
  }

  function Header({ axis, label, today }: { axis: Axis; label: number; today: string }) {
    return (
      <div aria-hidden className="relative flex border-b text-[11px] text-muted-foreground">
        <div className="sticky left-0 z-10 flex-none bg-card" style={{ width: label }} />
        <div className="relative h-10 flex-none" style={{ width: axis.width }}>
          {monthsOf(axis, today).map((m) => (
            <span key={m.key} className="absolute top-1 truncate pl-1 font-medium text-foreground" style={{ left: m.x, width: m.width }}>
              {m.label}
            </span>
          ))}
          {axis.columns
            .filter((c) => !c.weekend)
            .map((c) => (
              <span key={c.day} className="absolute bottom-1 text-center tabular-nums" style={{ left: c.x, width: c.width }}>
                {Number(c.iso.slice(8))}
              </span>
            ))}
        </div>
      </div>
    );
  }

  function EpicRow({ project, epic, axis, label, today }: { project: string; epic: EpicPlan; axis: Axis; label: number; today: string }) {
    const look = lookOf(epic.status);
    const Icon = look.icon;
    const days = beadsOf(epic);
    const x0 = xOf(axis, days[0]);
    const x1 = endOf(axis, days[days.length - 1]);
    const unestimated = epic.estimate_days === null;
    return (
      <li data-epic={epic.id} className="flex border-b last:border-b-0">
        <div className="sticky left-0 z-10 flex flex-none flex-col gap-0.5 bg-card px-3 py-1.5 text-sm" style={{ width: label }}>
          <span className="flex min-w-0 items-center gap-1.5">
            <Icon role="img" aria-label={look.label} className={cn("size-3.5 flex-none", look.text)} />
            <Link to={`/beads/${enc(project)}/${enc(epic.id)}`} className="font-mono text-xs text-muted-foreground underline-offset-2 hover:underline">
              {epic.id}
            </Link>
            <span title={epic.title} className="min-w-0 truncate font-medium">
              {epic.title}
            </span>
          </span>
          <span className="text-xs text-muted-foreground">
            {`${periodOf(epic.planned_start, epic.planned_end, today)}, ${unestimated ? "no estimate" : `${epic.estimate_days}d`}`}
          </span>
          {warningLines(epic, today).map((text) => (
            <span key={text} className="flex items-start gap-1 text-xs text-state-blocked">
              <TriangleAlert aria-hidden className="mt-0.5 size-3 flex-none" />
              {text}
            </span>
          ))}
        </div>
        <div className="relative flex-none" style={{ width: axis.width }}>
          <div
            aria-hidden
            className={cn("absolute top-2 h-4 motion-safe:transition-transform motion-safe:duration-150", look.text)}
            style={{ transform: `translateX(${x0}px)`, width: x1 - x0 }}
          >
            {days.length > 1 && <span className="absolute inset-x-2 top-1/2 h-px bg-current" />}
            {days.map((day) => (
              <span
                key={day}
                data-bead={isoOf(day)}
                className={cn("absolute top-0 h-4 rounded-full", unestimated ? "border border-dashed border-muted-foreground bg-card" : look.fill)}
                style={{ left: xOf(axis, day) - x0 + 2, width: endOf(axis, day) - xOf(axis, day) - 4 }}
              />
            ))}
          </div>
        </div>
      </li>
    );
  }
  ```
- [ ] **Step 8: Gantt tab.** Create `frontend/src/features/milestones/GanttTab.tsx`:
  ```tsx
  import { Button } from "@/components/ui/button";
  import type { MilestoneDetail } from "./api";
  import { CopyCommand } from "./CopyCommand";
  import { shortDate, weekday } from "./format";
  import { GanttChart } from "./GanttChart";
  import { MilestoneError } from "./MilestoneError";
  import type { LoadState } from "./useLoad";

  /** REQ-MILESTONE-UI-003 and -004: the current plan, or a read-only preview from a picked kick-start date. */
  export function GanttTab({
    project,
    plan,
    start,
    preview,
    onRetryPreview,
    onStart,
  }: {
    project: string;
    plan: MilestoneDetail;
    start: string | null;
    preview: LoadState<MilestoneDetail | null>;
    onRetryPreview: () => void;
    onStart: (date: string | null) => void;
  }) {
    const pickable = plan.status === "planned" || plan.status === "scheduled";
    const previewing = pickable && start !== null;
    const failed = previewing && preview.status === "error";
    const previewPlan = previewing && preview.status === "ok" ? preview.data : null;
    const busy = previewing && (preview.status === "loading" || (preview.status === "ok" && preview.stale));
    return (
      <div className="flex flex-col gap-3">
        {pickable && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              Kick-start date
              <input
                type="date"
                value={start ?? plan.kickoff ?? plan.start}
                disabled={busy}
                onChange={(event) => onStart(event.target.value === "" ? null : event.target.value)}
                className="rounded border bg-background px-2 py-1"
              />
            </label>
            {start !== null && (
              <Button variant="outline" size="sm" onClick={() => onStart(null)}>
                Reset
              </Button>
            )}
          </div>
        )}
        {previewing && !failed && (
          <div className="flex flex-col gap-2 rounded border border-dashed p-3 text-sm md:flex-row md:items-center md:justify-between">
            <p>{`Preview from ${weekday(start)} ${shortDate(start, plan.today)}. Nothing changes until you run:`}</p>
            <CopyCommand command={`gin-workflow milestone kickstart ${plan.id} --date ${start}`} />
          </div>
        )}
        {failed ? (
          <MilestoneError error={preview.error} onRetry={onRetryPreview} />
        ) : (
          <GanttChart project={project} plan={previewPlan ?? plan} preview={previewing} busy={busy} />
        )}
      </div>
    );
  }
  ```
  TypeScript narrows `start` to `string` inside the `previewing &&` branch, because `previewing` is a `const` built from `start !== null`. If the compiler fails to narrow it, write `start !== null && previewing && …` there instead.
- [ ] **Step 9: Page.** Create `frontend/src/features/milestones/MilestonePage.tsx`:
  ```tsx
  import { ArrowLeft } from "lucide-react";
  import { useCallback, useState } from "react";
  import { Link } from "@/app/Link";
  import { navigate, useLocation } from "@/app/route";
  import { cn } from "@/lib/utils";
  import { fetchMilestone, milestonePath, milestonesPath, type MilestoneDetail } from "./api";
  import { plural, shortDate } from "./format";
  import { GanttTab } from "./GanttTab";
  import { MilestoneError } from "./MilestoneError";
  import { MilestoneStatus } from "./MilestoneStatus";
  import { useLoad } from "./useLoad";

  const ISO = /^\d{4}-\d{2}-\d{2}$/;

  export function MilestonePage({ project, id }: { project: string; id: string }) {
    const { search } = useLocation();
    const asked = new URLSearchParams(search).get("start");
    const start = asked !== null && ISO.test(asked) ? asked : null;
    const current = useCallback(() => fetchMilestone(project, id, null), [project, id]);
    const preview = useCallback(
      () => (start === null ? Promise.resolve(null) : fetchMilestone(project, id, start)),
      [project, id, start],
    );
    const base = useLoad(current, true);
    const shown = useLoad<MilestoneDetail | null>(preview, false);
    const pick = (next: string | null) => navigate(milestonePath(project, id, "gantt", next), { replace: true });

    return (
      <section className="flex flex-col gap-4">
        <Link to={milestonesPath(project)} className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
          <ArrowLeft aria-hidden className="size-4" />
          {`Milestones in ${project}`}
        </Link>
        {base.state.status === "loading" && <p className="text-muted-foreground">Loading milestone…</p>}
        {base.state.status === "error" && <MilestoneError error={base.state.error} onRetry={base.retry} />}
        {base.state.status === "ok" && (
          <>
            <MilestoneHeader project={project} plan={base.state.data} />
            {base.state.error !== null && (
              <p role="status" className="text-sm text-destructive">{`Refresh failed: ${base.state.error.message}`}</p>
            )}
            <GanttTab
              project={project}
              plan={base.state.data}
              start={start}
              preview={shown.state}
              onRetryPreview={shown.retry}
              onStart={pick}
            />
          </>
        )}
      </section>
    );
  }

  export function MilestoneHeader({ plan }: { project: string; plan: MilestoneDetail }) {
    const [more, setMore] = useState(false);
    const date = (iso: string) => shortDate(iso, plan.today);
    const late = plan.overflow_days > 0;
    const outcome =
      plan.finish === null
        ? "No epics yet"
        : `Finishes ${date(plan.finish)}, ${late ? `${plural(plan.overflow_days, "working day")} past the end` : "on time"}`;
    return (
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-semibold">{plan.title}</h1>
          <span className="font-mono text-sm text-muted-foreground">{plan.id}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <MilestoneStatus status={plan.status} />
          <span>{`${date(plan.start)} – ${date(plan.end)}`}</span>
          {plan.kickoff !== null && <span>{`Kicks off ${date(plan.kickoff)}`}</span>}
          <span className={cn(late && "text-state-blocked")}>{outcome}</span>
        </div>
        {plan.description !== "" && (
          <div className="flex flex-col items-start gap-1 text-sm text-muted-foreground">
            <p className={cn(!more && "line-clamp-2")}>{plan.description}</p>
            <button type="button" onClick={() => setMore(!more)} className="underline underline-offset-2">
              {more ? "Show less" : "Show more"}
            </button>
          </div>
        )}
      </header>
    );
  }
  ```
  `MilestoneHeader` takes `project` for symmetry with the page props, and Track 6 passes it. If lint flags the unused destructured prop, drop `project` from both the props and the call.
- [ ] **Step 10: Route.** In `App.tsx`, add the following next to `beadRoute` and import `MilestonePage`:
  ```tsx
  function milestoneRoute(pathname: string): { project: string; id: string } | null {
    const match = /^\/milestones\/([^/]+)\/([^/]+)$/.exec(pathname);
    if (!match) return null;
    try {
      return { project: decodeURIComponent(match[1]), id: decodeURIComponent(match[2]) };
    } catch {
      return null;
    }
  }
  ```
  Then:
  - Compute `const milestone = milestoneRoute(pathname);` in `App`.
  - Add the branch `milestone !== null ? (<MilestonePage key={`${milestone.project}/${milestone.id}`} project={milestone.project} id={milestone.id} />) :` before the `bead !== null` branch.

  In `App.test.tsx`, add:
  ```tsx
    // REQ-UI-057
    it("REQ-UI-057 renders the milestone page on /milestones/:project/:id and marks Milestones", async () => {
      window.history.replaceState(null, "", "/milestones/alpha/m-1");
      vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ error: "no milestone command", cause: "outdated" }))));
      render(<App />);
      expect(await screen.findByRole("link", { name: "Milestones in alpha" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Milestones" })).toHaveAttribute("aria-current", "page");
    });
  ```
  The local `json` helper in `App.test.tsx` always answers 200, so the body fails the detail guard. The page then shows its generic error; the test only checks the route and the nav mark.
- [ ] **Step 11: Verify.** Run `pnpm -C frontend test --run src/features/milestones`, then the frontend verify commands. Expected: all pass.

---

### Track 6: Graph tab and tabs
- **Dependencies**: Track 3, Track 5
- **Requirements**: REQ-MILESTONE-UI-002
- **Files**:
  - Create `frontend/src/components/Tabs.tsx`
  - Test `frontend/src/components/Tabs.test.tsx`
  - Modify `frontend/src/features/beads/DetailTabs.tsx` (body delegates to `Tabs`; same props and ids)
  - Create `frontend/src/features/milestones/MilestoneGraph.tsx`
  - Modify `frontend/src/features/milestones/MilestonePage.tsx` (Gantt and Graph tabs from `?tab=`)
  - Test `frontend/src/features/milestones/MilestonePage.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** it reuses the existing graph engine and canvas. The only refactor is the tab list, which `BeadDetailPage` tests already pin.
- **Acceptance criteria**:
  - The REQ-MILESTONE-UI-002 scenarios pass.
  - The tab keys move between Gantt and Graph and update `?tab=`.
  - `BeadDetailPage` tests pass unchanged.
- **Estimated complexity**: medium

**Interfaces produced:**
```ts
export type TabItem<T extends string> = { value: T; label: string };
export function Tabs<T extends string>(props: { tabs: readonly TabItem<T>[]; tab: T; onChange: (tab: T) => void; label: string; className?: string }): JSX.Element;
export function MilestoneGraph(props: { project: string; id: string }): JSX.Element;
```

- [ ] **Step 1: Failing tests.** Create `frontend/src/components/Tabs.test.tsx`:
  ```tsx
  import { cleanup, render, screen } from "@testing-library/react";
  import userEvent from "@testing-library/user-event";
  import { useState } from "react";
  import { afterEach, describe, expect, it } from "vitest";
  import { Tabs } from "./Tabs";

  afterEach(cleanup);

  const TABS = [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
    { value: "c", label: "C" },
  ] as const;

  function Harness() {
    const [tab, setTab] = useState<"a" | "b" | "c">("a");
    return <Tabs tabs={TABS} tab={tab} onChange={setTab} label="Views" />;
  }

  describe("Tabs", () => {
    it("selects with a click and moves with the arrow keys, wrapping", async () => {
      render(<Harness />);
      expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute("aria-selected", "true");
      await userEvent.click(screen.getByRole("tab", { name: "C" }));
      expect(screen.getByRole("tab", { name: "C" })).toHaveAttribute("aria-selected", "true");
      await userEvent.keyboard("{ArrowRight}");
      expect(screen.getByRole("tab", { name: "A" })).toHaveFocus();
      expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute("aria-selected", "true");
      await userEvent.keyboard("{ArrowLeft}");
      expect(screen.getByRole("tab", { name: "C" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tablist", { name: "Views" })).toBeInTheDocument();
    });
  });
  ```
  Append inside `describe("MilestonePage", ...)` in `MilestonePage.test.tsx`, and add `import { bead } from "@/features/beads/beadFixtures";`:
  ```tsx
    const graphBeads = [
      bead("m-1", { issue_type: "milestone" }),
      bead("m-2", { issue_type: "milestone" }),
      bead("e-a", { issue_type: "epic", parent: "m-1", blocked_by: ["e-x"] }),
      bead("e-b", { issue_type: "epic", parent: "m-1", blocked_by: ["e-a"] }),
      bead("e-x", { issue_type: "epic", parent: "m-2" }),
    ];
    const graphNode = (id: string) => screen.findByRole("button", { name: new RegExp(`^${id}`) });

    it("REQ-MILESTONE-UI-002 graph: the milestone's epics with their edge, outside epics external", async () => {
      window.history.replaceState(null, "", "/milestones/alpha/m-1?tab=graph");
      stubMilestones(() => json(detail([epicPlan("e-a"), epicPlan("e-b")])), graphBeads);
      render(<MilestonePage project="alpha" id="m-1" />);
      expect(await graphNode("e-a")).toHaveAttribute("data-external", "false");
      expect(await graphNode("e-b")).toHaveAttribute("data-external", "false");
      expect(await graphNode("e-x")).toHaveAttribute("data-external", "true");
      expect(screen.queryByRole("button", { name: /^m-1/ })).toBeNull();
      expect(screen.getByText("Dashed nodes are outside this milestone.")).toBeInTheDocument();
    });

    it("REQ-MILESTONE-UI-002 the tabs switch between Gantt and Graph in the URL", async () => {
      open(detail([epicPlan("e-a")]));
      await userEvent.click(await screen.findByRole("tab", { name: "Graph" }));
      expect(window.location.search).toBe("?tab=graph");
      await userEvent.click(screen.getByRole("tab", { name: "Gantt" }));
      expect(window.location.search).toBe("");
    });
  ```
- [ ] **Step 2: Run them.** Run `pnpm -C frontend test --run src/components/Tabs.test.tsx src/features/milestones/MilestonePage.test.tsx`. Expected: the Tabs import fails and the two new MilestonePage tests fail.
- [ ] **Step 3: Tabs.** Create `frontend/src/components/Tabs.tsx`:
  ```tsx
  import type { KeyboardEvent } from "react";
  import { cn } from "@/lib/utils";

  export type TabItem<T extends string> = { value: T; label: string };

  /** A tab list: one tab stop, Left and Right move and select (wrapping); ids `tab-<value>` control `panel-<value>`. */
  export function Tabs<T extends string>({
    tabs,
    tab,
    onChange,
    label,
    className,
  }: {
    tabs: readonly TabItem<T>[];
    tab: T;
    onChange: (tab: T) => void;
    label: string;
    className?: string;
  }) {
    const move = (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const at = tabs.findIndex((t) => t.value === tab);
      const next = tabs[(at + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].value;
      onChange(next);
      event.currentTarget.parentElement?.querySelector<HTMLElement>(`#tab-${next}`)?.focus();
    };
    return (
      <div role="tablist" aria-label={label} className={cn("flex gap-2 border-b", className)}>
        {tabs.map(({ value, label: text }) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`tab-${value}`}
            aria-selected={tab === value}
            aria-controls={`panel-${value}`}
            tabIndex={tab === value ? 0 : -1}
            onClick={() => onChange(value)}
            onKeyDown={move}
            className={cn(
              "min-h-11 border-b-2 px-3 text-sm font-medium md:min-h-9",
              tab === value ? "border-foreground text-foreground" : "border-transparent text-muted-foreground",
            )}
          >
            {text}
          </button>
        ))}
      </div>
    );
  }
  ```
  Replace the body of `frontend/src/features/beads/DetailTabs.tsx` with:
  ```tsx
  import { Tabs } from "@/components/Tabs";

  export type DetailTab = "details" | "discussion";

  export function DetailTabs({
    tab,
    onChange,
    count,
    className,
  }: {
    tab: DetailTab;
    onChange: (tab: DetailTab) => void;
    count: number;
    className?: string;
  }) {
    return (
      <Tabs
        tabs={[
          { value: "details", label: "Details" },
          { value: "discussion", label: `Discussion (${count})` },
        ]}
        tab={tab}
        onChange={onChange}
        label="Bead sections"
        className={className}
      />
    );
  }
  ```
- [ ] **Step 4: Graph tab.** Create `frontend/src/features/milestones/MilestoneGraph.tsx`:
  ```tsx
  import { useState } from "react";
  import { navigate } from "@/app/route";
  import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
  import { Button } from "@/components/ui/button";
  import { GraphCanvas } from "@/features/beads/GraphCanvas";
  import { scopeGraph } from "@/features/beads/graph";
  import { useBeads } from "@/features/beads/useBeads";

  const enc = encodeURIComponent;

  /** REQ-MILESTONE-UI-002: the Dependencies graph scoped to the milestone; beads outside it are external nodes. */
  export function MilestoneGraph({ project, id }: { project: string; id: string }) {
    const { state, retry } = useBeads(project, true, true); // the milestone must be loaded to scope on it
    const [selected, setSelected] = useState("");
    if (state.status === "loading") return <p className="text-muted-foreground">Loading beads…</p>;
    if (state.status === "error") {
      return (
        <Alert variant="destructive">
          <AlertTitle>Beads could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{state.message}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    const graph = scopeGraph(state.beads, id, { hideDone: false, onlyLinked: false });
    if (graph.nodes.length === 0) return <p className="text-muted-foreground">No epics in this milestone.</p>;
    const known = new Set(graph.nodes.map((n) => n.bead.id));
    const tabStop = known.has(selected) ? selected : graph.nodes[0].bead.id;
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Dashed nodes are outside this milestone.</p>
        {graph.cycle.length > 0 && (
          <p role="status" className="text-sm text-state-blocked">{`Dependency cycle between ${graph.cycle.join(", ")}`}</p>
        )}
        <GraphCanvas
          graph={graph}
          selected={selected}
          tabStop={tabStop}
          onSelect={setSelected}
          onOpen={(bead) => navigate(`/beads/${enc(project)}/${enc(bead)}`)}
          onEscape={() => setSelected("")}
        />
      </div>
    );
  }
  ```
- [ ] **Step 5: Tabs on the page.** In `MilestonePage.tsx`:
  - Import `Tabs` from `@/components/Tabs` and `MilestoneGraph` from `./MilestoneGraph`.
  - Add the following above the component:
    ```ts
    const TABS = [
      { value: "gantt", label: "Gantt" },
      { value: "graph", label: "Graph" },
    ] as const;
    type Tab = (typeof TABS)[number]["value"];
    ```
  - In the component, read `const tab: Tab = new URLSearchParams(search).get("tab") === "graph" ? "graph" : "gantt";` and change `pick` to keep the tab: `navigate(milestonePath(project, id, tab, next), { replace: true })`.
  - Replace the `<GanttTab … />` element with:
    ```tsx
              <Tabs tabs={TABS} tab={tab} onChange={(next) => navigate(milestonePath(project, id, next, start), { replace: true })} label="Milestone views" />
              <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                {tab === "gantt" ? (
                  <GanttTab
                    project={project}
                    plan={base.state.data}
                    start={start}
                    preview={shown.state}
                    onRetryPreview={shown.retry}
                    onStart={pick}
                  />
                ) : (
                  <MilestoneGraph project={project} id={id} />
                )}
              </div>
    ```
- [ ] **Step 6: Verify.** Run the Step 2 command, then `pnpm -C frontend test --run src/features/beads/BeadDetailPage.test.tsx`, then the frontend verify commands. Expected: all pass.

---

### Track 7: Look at it in a browser
- **Dependencies**: Track 1, Track 2, Track 6
- **Requirements**: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-002, REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-004, REQ-MILESTONE-UI-005, REQ-MILESTONE-UI-009 (manual evidence)
- **Files**:
  - Modify `docs/changes/gin-console-djg-milestones/05-tests.md` (manual cases and their evidence)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** the agent only writes the cases down and records what the person reports.
- **Human gate**:
  - A person with a browser runs the built console against a real project that has a planned milestone with estimated epics. They check it on a laptop and a phone, in light and dark themes, and report what they saw.
  - The agent has no browser. Without that person, the cases stay "not run" and `/goal` stops before this track.
- **Acceptance criteria**: every row in `05-tests.md` has an evidence entry from the person, or says "not run" with the reason.
- **Estimated complexity**: low

- [ ] **Step 1: Write the cases.** Add these rows to the table in `05-tests.md`:
  ```markdown
  | TC-1 | REQ-MILESTONE-UI-001 | manual | Milestones list for a real project matches `gin-workflow milestone list --all --json` (status, period, progress, warnings, unassigned count) |
  | TC-2 | REQ-MILESTONE-UI-003 | manual | Gantt bars, weekends, today and end lines match `gin-workflow milestone show <id> --json`; laptop and phone, light and dark |
  | TC-3 | REQ-MILESTONE-UI-004 | manual | Picking a kick-start date redraws a preview that matches `show <id> --start <date> --json`; Copy puts the kickstart command on the clipboard; Reset returns |
  | TC-4 | REQ-MILESTONE-UI-002 | manual | Graph tab shows the milestone's epics and an epic of another milestone as a dashed node |
  | TC-5 | REQ-MILESTONE-UI-009 | manual | No milestone bead on the Beads List, Board, Focus and Dependencies views; its epics are top-level |
  | TC-6 | REQ-MILESTONE-UI-005 | manual | A project on markdown tracking shows the tracking error on the Milestones page |
  ```
- [ ] **Step 2: Prepare the run.**
  1. Run `pnpm -C frontend build`, then `uv run --directory backend -m gin_console`, and open `http://127.0.0.1:8700/milestones`.
  2. If no project has a milestone, create one in a scratch project with `gin-workflow milestone create "Trial" --start <next Monday> --end <four weeks later>` and add two estimated epics with `/roadmap --milestone <id>`.
- [ ] **Step 3: Record.** Write what the person reports in the evidence column (for example "ok, laptop + phone, light + dark, 2026-11-03"), or "not run: <reason>".

## Integration
- **Branch**: `feat/gin-console-djg-milestones`, cut from `spec/gin-console-djg-milestones`. That branch holds the change folder.
- **Merge strategy**: parallel-then-merge. Tracks 1-4 merge into the integration branch in any order, followed by Track 5, then Track 6, then Track 7. Tracks 1 and 2 both edit `collect.py`, in different functions; merge them one after the other and rerun the backend tests.

## Validation
- [ ] `uv run --directory backend pytest`, `uv run --directory backend ruff check .` and `uv run --directory backend mypy` pass.
- [ ] `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint` and `pnpm -C frontend build` pass.
- [ ] `gin-workflow specs trace --change gin-console-djg` reports no `missing` REQ.
- [ ] Track 7's manual cases are recorded in `05-tests.md`.

## Notes
- `Model:` and `Effort:` are chosen from the main harness catalog (`haiku`, `sonnet`, `opus`; `low`..`max`) using the route rubric.
- The user may override `Model:` and `Effort:` before plan approval.
- Provider roles describe responsibility rather than filename patterns.
- The Parent Bead `gin-console-djg` stays open until the human-confirmed merge. Track beads close when their tests and review pass, so that dependents unblock.
- Plan-time spec adjustments, made in this change folder:
  - REQ-UI-055 and REQ-UI-057 are now MODIFIED, because the nav gains Milestones.
  - The design now says that an external blocker names the milestone id (the `show` JSON has no title).
  - The design now says that only the title of a list row is a link.
