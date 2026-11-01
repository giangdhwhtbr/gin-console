# Plan: Team reports

Epic: gin-console-ce5
Spec: `docs/changes/gin-console-ce5-team-reports/` (01-proposal.md, 02-spec-delta.md, 03-design.md, 05-tests.md)

## Objective
A Reports page at `/reports` shows, per project or for all projects, AI usage (tokens and cost per member, epic, bead, stage, model and role), delivery flow (weekly throughput, cycle and lead time, work in progress, estimate against actual), quality and rework, and data coverage, computed read-only from `bd list --all` without counting an epic and its children twice. The "Main" navigation replaces Sessions with Reports; the Sessions pages stay reachable by URL.

## Goal, Architecture, Tech Stack
- Goal: the proposal's "What Changes" 1–4 (`01-proposal.md`).
- Architecture: a new bounded context `reports` (ADR 0001): backend `gin_console/reports/{models,source,service,router}.py`, frontend `src/features/reports/`. It reuses `BdRunner`, `BeadsError` (`beads/source.py`) and `KeyedCache` (`beads/service.py`), and `CopyCommand` (`features/milestones/CopyCommand.tsx`).
- Tech stack: FastAPI + pydantic 2 (mypy strict, ruff); React 19, Tailwind 4, shadcn/base-ui, vitest; new dependency `recharts@3.10.1` with its peer `react-is@19`.

## Global Constraints
Copied from the spec (`01-proposal.md` Non-goals, `03-design.md`):
- Any write: the console never runs `gin-workflow usage collect`, never edits prices or beads.
- Recomputing cost from a price table in the console: cost is the one written at collection.
- Antigravity and OpenCode usage.
- Team-mode area filters, custom date ranges, CSV export, stored history.
- Redesigning or removing the Sessions page and API (left to the web-chat epic).
- Computing reopens or bugs with `bd history` (REQ-BEADS-011 does that per bead page; here only `ai_usage.quality` counts).
- No gin-workflow change, no new config key, nothing written to disk or to Beads.
- External commands are injected into `create_app`; tests never run real CLIs.
- Every new or changed test carries its REQ-ID in the test name or a comment.

## Route Rubric
- Choose the weakest model that can do the work.
- Raise the model for broad context or design judgement.
- Raise the effort for intrinsic difficulty: intricate logic, many edge cases, or long chains of steps.

| Kind of work | Model | Effort |
|---|---|---|
| Mechanical edits, documentation, boilerplate | `haiku` | `low` |
| Bounded implementation with a clear spec | `sonnet` | `medium` |
| Cross-module change, security, migration, concurrency | `opus` | `high` |

Unclear requirements never raise the model or effort.

## Requirement Analysis
- Problem statement: a team running gin-workflow cannot see where tokens go, how fast beads move, or where work comes back, although `metadata.ai_usage`, `assignee` and the bead timestamps already hold it. The Sessions page is not useful in its current form.
- Success criteria (`01-proposal.md`): `gin-console-38i` appears in the epic list with `discuss` as its largest stage and a tree total equal to `gin-workflow usage report --epic gin-console-38i` totals (51,136,800 tokens, checked 2026-11-01); every REQ-ID has a test; the Reports chunk is separate; the browser check in `05-tests.md` passes.
- Constraints: Global Constraints above; Linux, macOS and Windows unaffected (no new process handling).
- Non-goals: Global Constraints above.

## Approach Options
### Option 1: console aggregates `bd list --all`
- Summary: one `bd list --all --limit 0 --json` per project; parse `metadata.ai_usage`; compute own shares and sections in pure Python.
- Pros: one command per project; holds assignee, timestamps and open beads (WIP); reuses `BdRunner`, `FakeBd`, `KeyedCache`.
- Cons: mirrors gin-workflow's no-double-count rule in the console.

### Option 2: `gin-workflow usage report --since` joined with `bd list`
- Summary: take gin-workflow's per-bead summaries, join assignee and timestamps from `bd list`.
- Pros: reuses gin-workflow's aggregation.
- Cons: two commands per project; still needs `bd list` for assignee, open beads and timestamps; `--since` and `--sprint` are exclusive and close-date based only.

### Recommended Approach
- Selected option: Option 1 (confirmed in discuss, 2026-11-01).
- Rationale: fewer commands, all fields in one answer, matches existing beads context patterns; the own-share rule is small and covered by a cross-check test.

## Scope
- In scope: REQ-REPORTS-001 to 007; REQ-UI-088 to 093; modified REQ-UI-008, 055, 057; `recharts` dependency; eight categorical series color tokens; manual cases TC-1 to TC-4.
- Out of scope: Global Constraints above.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Tracks 1, 3 and 5 touch disjoint files (backend reports context, frontend reports feature, navigation) and can run together; 2 waits for 1, 4 waits for 3, 6 waits for all.
```

## Interfaces shared by all tracks

The JSON of `GET /api/reports` is the pydantic `Report` of Track 1, serialized by FastAPI (datetimes as ISO 8601 strings, `None` as `null`). Track 3 mirrors it in TypeScript. Field names and types below are binding for every track.

```text
Report
  generated_at: datetime            project: str ("all" or a project name)
  days: int (7|30|90)               sprint: str | null
  totals:   Totals
  usage:    UsageSection
  delivery: DeliverySection
  quality:  QualitySection
  coverage: Coverage
  errors:   list[ProjectError]

Totals          tokens:int  cost:float|null  closed:int  tokens_per_bead:float|null  rework_rate:float|null
UsageSection    members:list[MemberUsage]  epics:list[EpicUsage]  beads:list[BeadUsage]  stages:list[StageRow]  models:list[ModelRow]
MemberUsage     member:str  closed:int  tokens:int  cost:float|null  tokens_per_bead:float|null  cache_ratio:float|null  stages:dict[str,int]
EpicUsage       project:str  id:str  title:str  status:str  tokens:int  cost:float|null  children:int  closed_children:int  budget:Budget|null
Budget          budget_usd:float  cost:float|null  status:str
BeadUsage       project:str  id:str  title:str  issue_type:str  assignee:str|null  tokens:int  cost:float|null
StageRow        stage:str  tokens:int  cost:float|null
ModelRow        model:str  role:str  input:int  output:int  cache_read:int  cache_write:int  tokens:int  cost:float|null
DeliverySection weeks:list[WeekRow]  by_type:list[TimeRow]  by_member:list[TimeRow]  wip:list[WipRow]  oldest:list[WipBead]  estimates:list[EstimateRow]
WeekRow         week:str ("2026-W44")  counts:dict[str,int] (issue_type -> beads closed)
TimeRow         key:str  cycle:Stat|null  lead:Stat|null
Stat            n:int  median:float  p85:float      (days)
WipRow          member:str  count:int
WipBead         project:str  id:str  title:str  assignee:str|null  age_days:float
EstimateRow     project:str  id:str  title:str  estimate_days:float  actual_days:int
QualitySection  members:list[QualityRow]  epics:list[QualityRow]  points:list[Point]
QualityRow      key:str  project:str|null  title:str|null  beads:int  reopens:int  bugs:int  review_cycles:int
                rejections:int  waivers:int  findings:Findings  rework_rate:float|null
Findings        critical:int  important:int  minor:int  suggestion:int
Point           project:str  id:str  title:str  tokens:int  rework:int
Coverage        not_collected:list[CoverageBead]  invalid:list[CoverageBead]  unpriced:list[str]
                unassigned_share:float|null  sources:list[SourceIssue]
CoverageBead    project:str  id:str  title:str  detail:str   (the collect command, or "unreadable" / "version N")
SourceIssue     project:str  id:str  title:str  sources:dict[str,str]  skipped_lines:int
ProjectError    project:str  error:str
```

Rules fixed for every track: the member of a bead is its `assignee`, or `"Unassigned"` when it has none; a token is `input + output + cache_read + cache_write`; rates are fractions in `[0, 1]` rounded to 4 places; costs are rounded to 6 places; days in `Stat` are rounded to 2 places.

## Tasks

### Track 1: Reports models, source and service
- **Dependencies**: none
- **Requirements**: REQ-REPORTS-002, REQ-REPORTS-003, REQ-REPORTS-004, REQ-REPORTS-005, REQ-REPORTS-006
- **Files**:
  - Create `backend/src/gin_console/reports/__init__.py` (empty)
  - Create `backend/src/gin_console/reports/models.py`
  - Create `backend/src/gin_console/reports/source.py`
  - Create `backend/src/gin_console/reports/service.py`
  - Create `backend/tests/report_beads.py` (fixture builders)
  - Test `backend/tests/test_reports_source.py`
  - Test `backend/tests/test_reports_service.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** bounded to one new module with the code below, but the own-share subtraction, selection, percentiles and working days have many edge cases that a careless step gets subtly wrong.
- **Acceptance criteria**: every scenario of REQ-REPORTS-002 to 006 has a passing test named with its REQ-ID; the cross-check test proves the own shares of an epic tree sum to the epic's own `ai_usage` total; `uv run --directory backend pytest tests/test_reports_source.py tests/test_reports_service.py`, `ruff check .` and `mypy` pass.
- **Estimated complexity**: high

**Interfaces produced** (consumed by Track 2):
- `gin_console.reports.models`: every model of "Interfaces shared by all tracks", plus `Tokens`, `StageUsage`, `Quality`, `AiUsage`, `ReportBead`.
- `gin_console.reports.source.read_beads(run: BdRunner, cwd: Path, project: str) -> list[ReportBead]` (raises `BeadsError`).
- `gin_console.reports.service.build_report(beads: list[ReportBead], *, now: datetime, project: str, days: int, sprint: str | None, errors: list[ProjectError]) -> Report`.

- [ ] **Step 1: Models.** Create `backend/src/gin_console/reports/__init__.py` empty and `backend/src/gin_console/reports/models.py`:

```python
"""The report of GET /api/reports and the parsed `ai_usage` it is built from."""

from datetime import datetime

from pydantic import BaseModel, Field


class Tokens(BaseModel):
    input: int = 0
    output: int = 0
    cache_read: int = 0
    cache_write: int = 0
    cost: float | None = None

    @property
    def total(self) -> int:
        return self.input + self.output + self.cache_read + self.cache_write


class StageUsage(BaseModel):
    tokens: int = 0
    cost: float | None = None


class Findings(BaseModel):
    critical: int = 0
    important: int = 0
    minor: int = 0
    suggestion: int = 0


class Quality(BaseModel):
    reopens: int = 0
    bugs: int = 0
    review_cycles: int = 0
    rejections: int = 0
    waivers: int = 0
    findings: Findings = Field(default_factory=Findings)


class Budget(BaseModel):
    budget_usd: float
    cost: float | None = None
    status: str


class AiUsage(BaseModel):
    """`metadata.ai_usage` version 1, as gin-workflow `usage collect` writes it."""

    version: int
    models: dict[str, Tokens] = Field(default_factory=dict)
    roles: dict[str, dict[str, Tokens]] = Field(default_factory=dict)
    stages: dict[str, StageUsage] = Field(default_factory=dict)
    quality: Quality = Field(default_factory=Quality)
    unpriced: list[str] = Field(default_factory=list)
    sources: dict[str, str] = Field(default_factory=dict)
    skipped_lines: int = 0
    budget: Budget | None = None


class ReportBead(BaseModel):
    project: str
    id: str
    title: str
    issue_type: str
    status: str
    assignee: str | None = None
    parent: str | None = None
    labels: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    closed_at: datetime | None = None
    estimated_minutes: int | None = None
    usage: AiUsage | None = None
    usage_problem: str | None = None  # "unreadable" or "version N"; None when usage is fine or absent


class Totals(BaseModel):
    tokens: int
    cost: float | None
    closed: int
    tokens_per_bead: float | None
    rework_rate: float | None


class MemberUsage(BaseModel):
    member: str
    closed: int
    tokens: int
    cost: float | None
    tokens_per_bead: float | None
    cache_ratio: float | None
    stages: dict[str, int]


class EpicUsage(BaseModel):
    project: str
    id: str
    title: str
    status: str
    tokens: int
    cost: float | None
    children: int
    closed_children: int
    budget: Budget | None


class BeadUsage(BaseModel):
    project: str
    id: str
    title: str
    issue_type: str
    assignee: str | None
    tokens: int
    cost: float | None


class StageRow(BaseModel):
    stage: str
    tokens: int
    cost: float | None


class ModelRow(BaseModel):
    model: str
    role: str
    input: int
    output: int
    cache_read: int
    cache_write: int
    tokens: int
    cost: float | None


class UsageSection(BaseModel):
    members: list[MemberUsage]
    epics: list[EpicUsage]
    beads: list[BeadUsage]
    stages: list[StageRow]
    models: list[ModelRow]


class Stat(BaseModel):
    n: int
    median: float
    p85: float


class TimeRow(BaseModel):
    key: str
    cycle: Stat | None
    lead: Stat | None


class WeekRow(BaseModel):
    week: str
    counts: dict[str, int]


class WipRow(BaseModel):
    member: str
    count: int


class WipBead(BaseModel):
    project: str
    id: str
    title: str
    assignee: str | None
    age_days: float


class EstimateRow(BaseModel):
    project: str
    id: str
    title: str
    estimate_days: float
    actual_days: int


class DeliverySection(BaseModel):
    weeks: list[WeekRow]
    by_type: list[TimeRow]
    by_member: list[TimeRow]
    wip: list[WipRow]
    oldest: list[WipBead]
    estimates: list[EstimateRow]


class QualityRow(BaseModel):
    key: str
    project: str | None
    title: str | None
    beads: int
    reopens: int
    bugs: int
    review_cycles: int
    rejections: int
    waivers: int
    findings: Findings
    rework_rate: float | None


class Point(BaseModel):
    project: str
    id: str
    title: str
    tokens: int
    rework: int


class QualitySection(BaseModel):
    members: list[QualityRow]
    epics: list[QualityRow]
    points: list[Point]


class CoverageBead(BaseModel):
    project: str
    id: str
    title: str
    detail: str


class SourceIssue(BaseModel):
    project: str
    id: str
    title: str
    sources: dict[str, str]
    skipped_lines: int


class Coverage(BaseModel):
    not_collected: list[CoverageBead]
    invalid: list[CoverageBead]
    unpriced: list[str]
    unassigned_share: float | None
    sources: list[SourceIssue]


class ProjectError(BaseModel):
    project: str
    error: str


class Report(BaseModel):
    generated_at: datetime
    project: str
    days: int
    sprint: str | None
    totals: Totals
    usage: UsageSection
    delivery: DeliverySection
    quality: QualitySection
    coverage: Coverage
    errors: list[ProjectError]
```

- [ ] **Step 2: Fixture builders.** Create `backend/tests/report_beads.py`:

```python
"""Rows as `bd list --all --json` prints them, with an `ai_usage` built from a few numbers."""

import json
from typing import Any

from fake_bd import bead


def usage(
    tokens: int = 0,
    *,
    model: str = "m",
    stage: str = "execute",
    role: str = "main",
    cost: float | None = None,
    stages: dict[str, int] | None = None,
    **quality: Any,
) -> dict[str, Any]:
    """An ai_usage of `tokens` output tokens of one model; `stages` overrides the single stage."""
    per_stage = stages or {stage: tokens}
    total = sum(per_stage.values())
    model_entry = {"input": 0, "output": total, "cache_read": 0, "cache_write": 0, "cost": cost}
    findings = quality.pop("findings", {})
    return {
        "version": 1,
        "models": {model: model_entry},
        "roles": {role: {model: model_entry}},
        "stages": {name: {"tokens": value, "cost": None} for name, value in per_stage.items()},
        "quality": {
            "reopens": 0, "bugs": 0, "review_cycles": 0, "rejections": 0, "waivers": 0,
            "findings": {"critical": 0, "important": 0, "minor": 0, "suggestion": 0, **findings},
            **quality,
        },
        "unpriced": [model] if cost is None else [],
        "sources": {"claude_code": "ok", "codex": "ok"},
        "skipped_lines": 0,
    }


def row(ident: str, *, ai: dict[str, Any] | str | None = None, **fields: Any) -> dict[str, Any]:
    """A `bd list` row; `ai` is stored as a JSON string, as bd does."""
    base = bead(ident, **fields)
    if ai is not None:
        base["metadata"] = {"ai_usage": ai if isinstance(ai, str) else json.dumps(ai)}
    return base


def closed(ident: str, at: str, **fields: Any) -> dict[str, Any]:
    return row(ident, status="closed", closed_at=at, **fields)
```

- [ ] **Step 3: Failing source tests.** Create `backend/tests/test_reports_source.py`:

```python
import json
from pathlib import Path

import pytest
from fake_bd import FakeBd
from report_beads import row, usage

from gin_console.beads.source import BeadsError
from gin_console.reports.source import read_beads


# REQ-REPORTS-002
def test_reports_002_reads_ai_usage_from_a_json_string(tmp_path: Path) -> None:
    fake = FakeBd([row("a-1", ai=usage(700), assignee="ann", started_at="2026-10-12T10:00:00Z")])
    [only] = read_beads(fake, tmp_path, "alpha")
    assert fake.calls == [(["list", "--all", "--limit", "0", "--json"], tmp_path)]
    assert only.project == "alpha" and only.assignee == "ann" and only.started_at is not None
    assert only.usage is not None and only.usage.models["m"].total == 700
    assert only.usage_problem is None


# REQ-REPORTS-006
@pytest.mark.parametrize(
    ("ai", "problem"),
    [("not json", "unreadable"), (json.dumps({"version": 2}), "version 2"), (json.dumps([1]), "unreadable"),
     (json.dumps({"version": 1, "models": {"m": {"input": "x"}}}), "unreadable")],
)
def test_reports_006_unreadable_usage_is_marked_not_raised(tmp_path: Path, ai: str, problem: str) -> None:
    [only] = read_beads(FakeBd([row("a-1", ai=ai)]), tmp_path, "alpha")
    assert only.usage is None and only.usage_problem == problem


def test_reports_006_missing_usage_and_bad_rows(tmp_path: Path) -> None:
    beads = read_beads(FakeBd([row("a-1"), {"id": 3}, "junk"]), tmp_path, "alpha")
    assert [(b.id, b.usage, b.usage_problem) for b in beads] == [("a-1", None, None)]


def test_reports_007_bd_output_not_a_list(tmp_path: Path) -> None:
    with pytest.raises(BeadsError):
        read_beads(FakeBd(output={"error": "boom"}), tmp_path, "alpha")
```

Run: `uv run --directory backend pytest tests/test_reports_source.py` → fails with `ModuleNotFoundError: gin_console.reports.source`.

- [ ] **Step 4: Source.** Create `backend/src/gin_console/reports/source.py`:

```python
"""Beads of one project for reports, read with `bd list --all`; parses `metadata.ai_usage`."""

import json
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from gin_console.beads.source import BdRunner, BeadsError
from gin_console.reports.models import AiUsage, ReportBead

_KEYS = (
    "id", "title", "issue_type", "status", "assignee", "parent", "labels",
    "created_at", "updated_at", "started_at", "closed_at", "estimated_minutes",
)


def parse_usage(metadata: Any) -> tuple[AiUsage | None, str | None]:
    """(usage, None) when readable; (None, None) when absent; (None, problem) otherwise."""
    raw = metadata.get("ai_usage") if isinstance(metadata, dict) else None
    if raw is None:
        return None, None
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return None, "unreadable"
    if not isinstance(raw, dict):
        return None, "unreadable"
    if raw.get("version") != 1:
        return None, f"version {raw.get('version')}"
    try:
        return AiUsage.model_validate(raw), None
    except ValidationError:
        return None, "unreadable"


def read_beads(run: BdRunner, cwd: Path, project: str) -> list[ReportBead]:
    data = run(["list", "--all", "--limit", "0", "--json"], cwd)
    if not isinstance(data, list):
        raise BeadsError("bd list output was not understood")
    beads: list[ReportBead] = []
    for raw in data:
        if not isinstance(raw, dict):
            continue
        usage, problem = parse_usage(raw.get("metadata"))
        fields = {key: raw[key] for key in _KEYS if raw.get(key) is not None}
        try:
            beads.append(
                ReportBead.model_validate(
                    {**fields, "project": project, "usage": usage, "usage_problem": problem}
                )
            )
        except ValidationError:
            continue  # a row with wrong types is left out, as REQ-BEADS-005 does for lists
    return beads
```

Run the source tests → pass.

- [ ] **Step 5: Failing service tests.** Create `backend/tests/test_reports_service.py`. `NOW = datetime(2026, 11, 2, 12, 0, tzinfo=UTC)` (a Monday); helper `report(rows, *, days=30, sprint=None)` builds `ReportBead`s with `read_beads(FakeBd(rows), Path("."), "alpha")` and calls `build_report(..., now=NOW, project="alpha", days=days, sprint=sprint, errors=[])`. Tests (each named `test_reports_<nnn>_...` with its REQ-ID):
  - REQ-REPORTS-002 epic with collected children: epic `e-1` (`issue_type="epic"`) closed with `usage(stages={"discuss": 1000, "execute": 600})`, child `e-1.1` (`parent="e-1"`) closed with `usage(600)` → `{s.stage: s.tokens for s in r.usage.stages} == {"discuss": 1000, "execute": 600}` and `r.totals.tokens == 1600`; the epic row in `r.usage.beads` has 1000 tokens.
  - REQ-REPORTS-002 clamp: epic `usage(500)` and child `usage(700)` → epic own tokens 0 (its `BeadUsage.tokens == 0`), total 700.
  - REQ-REPORTS-002 cross-check: epic `usage(stages={"discuss": 900, "execute": 450, "review": 150})` with two children `usage(200)` and `usage(stages={"execute": 250, "review": 150})` → `r.totals.tokens == 1500`, the epic's own `ai_usage` total (the rule of gin-workflow `usage.report`: the top-level summary already holds its children).
  - REQ-REPORTS-002 unpriced: a bead with `usage(300, cost=None)` → `r.totals.cost is None` and `r.totals.tokens == 300`; with `cost=0.5` → `r.totals.cost == 0.5`.
  - REQ-REPORTS-002 grandchildren: epic → task `t-1` (`parent="e-1"`) → subtask `t-1.1` (`parent="t-1"`), all with usage → only `t-1` is subtracted from the epic (gin-workflow collects direct children only).
  - REQ-REPORTS-001 period (service part): beads closed 3, 20 and 40 days before `NOW` → `r.totals.closed == 2`.
  - REQ-REPORTS-001 sprint (service part): epic `a-1` with `labels=["sprint:s7"]`, its child closed 50 days ago, epic `a-2` without the label and its child closed yesterday → with `sprint="s7"`, `r.totals.closed == 1` and that bead is the child of `a-1`.
  - REQ-REPORTS-003 member rows: `ann` closes beads of 100 and 300 tokens, an unassigned bead of 50 → `MemberUsage("ann", closed=2, tokens=400, tokens_per_bead=200.0)` and `("Unassigned", closed=1, tokens=50)`; members sorted by tokens descending.
  - REQ-REPORTS-003 open epic with closed children: open epic `a-1` without usage, two closed children of 200 tokens → `r.usage.epics == [EpicUsage(... id="a-1", tokens=400, children=2, closed_children=2, budget=None ...)]`.
  - REQ-REPORTS-003 stages order and cache ratio: stages listed in the order discuss, plan, orchestrate, execute, review, verify, ship, quick, then any other stage alphabetically; a model entry `{"input": 10, "output": 5, "cache_read": 80, "cache_write": 10}` gives `cache_ratio == 0.8`.
  - REQ-REPORTS-003 top 10: twelve closed epics with distinct token counts → `len(r.usage.epics) == 10` and `len(r.usage.beads) == 10`, the largest first.
  - REQ-REPORTS-004 percentiles: five closed tasks with `started_at` 1, 2, 3, 4 and 10 days before their `closed_at` → by_type `task` cycle `Stat(n=5, median=3.0, p85=6.4)`.
  - REQ-REPORTS-004 missing start and inverted times: a closed task without `started_at` counts in `weeks` and lead time, not in cycle (`cycle is None` when it is the only one); a task with `started_at` after `closed_at` is left out of cycle time.
  - REQ-REPORTS-004 weeks: with `days=7`, `[w.week for w in r.delivery.weeks] == ["2026-W44", "2026-W45"]` (2026-10-26 to 2026-11-02) and a bead closed on 2026-10-30 counts under `2026-W44` by its `issue_type`.
  - REQ-REPORTS-004 WIP: `ann` has two `in_progress` beads started 10 and 2 days ago, `bob` one without `started_at` and `updated_at` 5 days ago → `wip == [WipRow("ann", 2), WipRow("bob", 1)]`, `oldest` ids in order 10, 5, 2 days with `age_days` 10.0, 5.0, 2.0; closed beads never appear.
  - REQ-REPORTS-004 estimate: epic with `estimated_minutes=2400`, `created_at="2026-10-19T09:00:00Z"` (Monday), `closed_at="2026-10-27T17:00:00Z"` (next Tuesday) → `EstimateRow(estimate_days=5.0, actual_days=7)`; an epic without estimate gives no row.
  - REQ-REPORTS-005 rework rate: `ann` closes 4 beads with usage, one with `reopens=1` → member row `reopens == 1`, `rework_rate == 0.25`; findings sum per severity.
  - REQ-REPORTS-005 points: closed task of 900 tokens with `reopens=1, rejections=2` and a closed epic → `points == [Point(project="alpha", id=<task>, title=..., tokens=900, rework=3)]`.
  - REQ-REPORTS-006 not collected: closed `a-9` without usage → `CoverageBead(id="a-9", detail="gin-workflow usage collect --bead a-9")` and `r.totals.tokens == 0`, `r.totals.tokens_per_bead is None`.
  - REQ-REPORTS-006 unreadable usage: closed beads with `ai='{"version": 2}'` and `ai="nope"` → `invalid` details `"version 2"` and `"unreadable"`, report built.
  - REQ-REPORTS-006 unpriced, unassigned share, sources: two beads with `usage(300)` (model `m`, unpriced) assigned to `ann` and `usage(100)` unassigned whose `sources` has `"codex": "missing"` → `unpriced == ["m"]`, `unassigned_share == 0.25`, `sources` holds only the second bead.

Run: `uv run --directory backend pytest tests/test_reports_service.py` → fails with `ModuleNotFoundError: gin_console.reports.service`.

- [ ] **Step 6: Service.** Create `backend/src/gin_console/reports/service.py`:

```python
"""Report sections from the beads of one or more projects (spec REQ-REPORTS-002..006)."""

import statistics
from collections import Counter, defaultdict
from collections.abc import Callable, Iterable
from datetime import date, datetime, timedelta
from typing import NamedTuple

from gin_console.reports.models import (
    AiUsage, BeadUsage, Coverage, CoverageBead, DeliverySection, EpicUsage, EstimateRow, Findings,
    MemberUsage, ModelRow, Point, ProjectError, Quality, QualityRow, QualitySection, Report,
    ReportBead, SourceIssue, StageRow, StageUsage, Stat, TimeRow, Tokens, Totals, UsageSection,
    WeekRow, WipBead, WipRow,
)

UNASSIGNED = "Unassigned"
TOP = 10
OLDEST = 5
WORKDAY_MINUTES = 480  # gin-workflow workflow_core/milestone.py WORKDAY_MINUTES
STAGES = ("discuss", "plan", "orchestrate", "execute", "review", "verify", "ship", "quick")
DAY = 86400.0

Key = tuple[str, str]  # (project, bead id)


class Measured(NamedTuple):
    bead: ReportBead
    raw: AiUsage  # the bead's ai_usage as written
    own: AiUsage  # its own share (REQ-REPORTS-002)


def _key(bead: ReportBead) -> Key:
    return (bead.project, bead.id)


def member_of(bead: ReportBead) -> str:
    return bead.assignee or UNASSIGNED


def tokens_of(usage: AiUsage) -> int:
    return sum(t.total for t in usage.models.values())


def _cost(values: Iterable[float | None]) -> float | None:
    known = [v for v in values if v is not None]
    return round(sum(known), 6) if known else None


def _left(value: int, subtract: Iterable[int]) -> int:
    return max(value - sum(subtract), 0)


def _left_cost(value: float | None, subtract: Iterable[float | None]) -> float | None:
    return None if value is None else round(max(value - sum(v or 0.0 for v in subtract), 0.0), 6)


def _minus(a: Tokens, subs: list[Tokens]) -> Tokens:
    return Tokens(
        input=_left(a.input, (s.input for s in subs)),
        output=_left(a.output, (s.output for s in subs)),
        cache_read=_left(a.cache_read, (s.cache_read for s in subs)),
        cache_write=_left(a.cache_write, (s.cache_write for s in subs)),
        cost=_left_cost(a.cost, (s.cost for s in subs)),
    )


def _minus_quality(q: Quality, subs: list[Quality]) -> Quality:
    f = q.findings
    return Quality(
        reopens=_left(q.reopens, (s.reopens for s in subs)),
        bugs=_left(q.bugs, (s.bugs for s in subs)),
        review_cycles=_left(q.review_cycles, (s.review_cycles for s in subs)),
        rejections=_left(q.rejections, (s.rejections for s in subs)),
        waivers=_left(q.waivers, (s.waivers for s in subs)),
        findings=Findings(
            critical=_left(f.critical, (s.findings.critical for s in subs)),
            important=_left(f.important, (s.findings.important for s in subs)),
            minor=_left(f.minor, (s.findings.minor for s in subs)),
            suggestion=_left(f.suggestion, (s.findings.suggestion for s in subs)),
        ),
    )


def own_share(usage: AiUsage, children: list[AiUsage]) -> AiUsage:
    """An epic's usage minus its direct children's, never below 0 (gin-workflow collects an epic
    over {epic, *direct children}; `usage.report` counts only top-level summaries)."""
    if not children:
        return usage
    models = {
        m: _minus(t, [c.models[m] for c in children if m in c.models]) for m, t in usage.models.items()
    }
    roles = {
        r: {m: _minus(t, [c.roles[r][m] for c in children if m in c.roles.get(r, {})]) for m, t in per.items()}
        for r, per in usage.roles.items()
    }
    stages = {
        s: StageUsage(
            tokens=_left(v.tokens, (c.stages[s].tokens for c in children if s in c.stages)),
            cost=_left_cost(v.cost, (c.stages[s].cost for c in children if s in c.stages)),
        )
        for s, v in usage.stages.items()
    }
    quality = _minus_quality(usage.quality, [c.quality for c in children])
    return usage.model_copy(update={"models": models, "roles": roles, "stages": stages, "quality": quality})


class _Tree:
    def __init__(self, beads: list[ReportBead]) -> None:
        self.index: dict[Key, ReportBead] = {_key(b): b for b in beads}
        self.children: dict[Key, list[ReportBead]] = defaultdict(list)
        for bead in beads:
            if bead.parent:
                self.children[(bead.project, bead.parent)].append(bead)

    def _lineage(self, bead: ReportBead) -> Iterable[ReportBead]:
        """The bead, then its ancestors; stops on a cycle or a parent outside the list."""
        seen: set[Key] = set()
        current: ReportBead | None = bead
        while current is not None and _key(current) not in seen:
            yield current
            seen.add(_key(current))
            parent = current.parent
            current = self.index.get((current.project, parent)) if parent else None

    def epic_of(self, bead: ReportBead) -> ReportBead | None:
        return next((b for b in self._lineage(bead) if b.issue_type == "epic"), None)

    def under(self, bead: ReportBead, roots: set[Key]) -> bool:
        return any(_key(b) in roots for b in self._lineage(bead))

    def own(self, bead: ReportBead) -> AiUsage | None:
        if bead.usage is None or bead.issue_type != "epic":
            return bead.usage
        kids = [c.usage for c in self.children.get(_key(bead), []) if c.usage is not None]
        return own_share(bead.usage, kids)


def _closed_at(bead: ReportBead) -> datetime:
    assert bead.closed_at is not None  # only closed beads with closed_at are selected
    return bead.closed_at


def _rate(qualities: list[Quality]) -> float | None:
    if not qualities:
        return None
    return round(sum(1 for q in qualities if q.reopens > 0 or q.bugs > 0) / len(qualities), 4)


def _stat(values: list[float]) -> Stat | None:
    if not values:
        return None
    ordered = sorted(values)
    p85 = ordered[0] if len(ordered) == 1 else statistics.quantiles(ordered, n=100, method="inclusive")[84]
    return Stat(n=len(ordered), median=round(statistics.median(ordered), 2), p85=round(p85, 2))


def _span(start: datetime | None, end: datetime | None) -> float | None:
    if start is None or end is None or end < start:
        return None
    return (end - start).total_seconds() / DAY


def _week(day: date) -> str:
    year, week, _ = day.isocalendar()
    return f"{year}-W{week:02d}"


def _weeks(first: date, last: date) -> list[str]:
    weeks: list[str] = []
    monday = first - timedelta(days=first.weekday())
    while monday <= last:
        weeks.append(_week(monday))
        monday += timedelta(days=7)
    return weeks


def _weekdays(first: date, last: date) -> int:
    return sum(1 for n in range((last - first).days + 1) if (first + timedelta(days=n)).weekday() < 5)


def _stage_order(stage: str) -> tuple[int, str]:
    return (STAGES.index(stage), "") if stage in STAGES else (len(STAGES), stage)


def _totals(closed: list[ReportBead], measured: list[Measured]) -> Totals:
    tokens = sum(tokens_of(m.own) for m in measured)
    return Totals(
        tokens=tokens,
        cost=_cost(t.cost for m in measured for t in m.own.models.values()),
        closed=len(closed),
        tokens_per_bead=round(tokens / len(measured), 1) if measured else None,
        rework_rate=_rate([m.own.quality for m in measured]),
    )


def _member_usage(name: str, closed: list[ReportBead], rows: list[Measured]) -> MemberUsage:
    tokens = sum(tokens_of(m.own) for m in rows)
    models = [t for m in rows for t in m.own.models.values()]
    read_side = sum(t.input + t.cache_read + t.cache_write for t in models)
    stages: dict[str, int] = defaultdict(int)
    for m in rows:
        for stage, value in m.own.stages.items():
            stages[stage] += value.tokens
    return MemberUsage(
        member=name,
        closed=sum(1 for b in closed if member_of(b) == name),
        tokens=tokens,
        cost=_cost(t.cost for t in models),
        tokens_per_bead=round(tokens / len(rows), 1) if rows else None,
        cache_ratio=round(sum(t.cache_read for t in models) / read_side, 4) if read_side else None,
        stages=dict(stages),
    )


def _by_epic(tree: _Tree, measured: list[Measured]) -> dict[Key, list[Measured]]:
    groups: dict[Key, list[Measured]] = defaultdict(list)
    for m in measured:
        epic = tree.epic_of(m.bead)
        if epic is not None:
            groups[_key(epic)].append(m)
    return groups


def _usage(tree: _Tree, closed: list[ReportBead], measured: list[Measured]) -> UsageSection:
    members = [
        _member_usage(name, closed, [m for m in measured if member_of(m.bead) == name])
        for name in {member_of(b) for b in closed}
    ]
    members.sort(key=lambda r: (-r.tokens, r.member))
    epics: list[EpicUsage] = []
    for key, rows in _by_epic(tree, measured).items():
        epic = tree.index[key]
        kids = tree.children.get(key, [])
        epics.append(
            EpicUsage(
                project=epic.project, id=epic.id, title=epic.title, status=epic.status,
                tokens=sum(tokens_of(m.own) for m in rows),
                cost=_cost(t.cost for m in rows for t in m.own.models.values()),
                children=len(kids), closed_children=sum(1 for k in kids if k.status == "closed"),
                budget=epic.usage.budget if epic.usage is not None else None,
            )
        )
    epics.sort(key=lambda r: (-r.tokens, r.project, r.id))
    beads = [
        BeadUsage(
            project=m.bead.project, id=m.bead.id, title=m.bead.title, issue_type=m.bead.issue_type,
            assignee=m.bead.assignee, tokens=tokens_of(m.own),
            cost=_cost(t.cost for t in m.own.models.values()),
        )
        for m in measured
    ]
    beads.sort(key=lambda r: (-r.tokens, r.project, r.id))
    stage_tokens: dict[str, int] = defaultdict(int)
    stage_costs: dict[str, list[float | None]] = defaultdict(list)
    model_rows: dict[tuple[str, str], list[Tokens]] = defaultdict(list)
    for m in measured:
        for stage, value in m.own.stages.items():
            stage_tokens[stage] += value.tokens
            stage_costs[stage].append(value.cost)
        for role, per in m.own.roles.items():
            for model, tokens in per.items():
                model_rows[(role, model)].append(tokens)
    stages = [
        StageRow(stage=s, tokens=stage_tokens[s], cost=_cost(stage_costs[s]))
        for s in sorted(stage_tokens, key=_stage_order)
    ]
    models = [
        ModelRow(
            model=model, role=role,
            input=sum(t.input for t in items), output=sum(t.output for t in items),
            cache_read=sum(t.cache_read for t in items), cache_write=sum(t.cache_write for t in items),
            tokens=sum(t.total for t in items), cost=_cost(t.cost for t in items),
        )
        for (role, model), items in model_rows.items()
    ]
    models.sort(key=lambda r: (-r.tokens, r.model, r.role))
    return UsageSection(members=members, epics=epics[:TOP], beads=beads[:TOP], stages=stages, models=models)


def _times(closed: list[ReportBead], key: Callable[[ReportBead], str]) -> list[TimeRow]:
    cycle: dict[str, list[float]] = defaultdict(list)
    lead: dict[str, list[float]] = defaultdict(list)
    for bead in closed:
        if (days := _span(bead.started_at, bead.closed_at)) is not None:
            cycle[key(bead)].append(days)
        if (days := _span(bead.created_at, bead.closed_at)) is not None:
            lead[key(bead)].append(days)
    return [
        TimeRow(key=k, cycle=_stat(cycle.get(k, [])), lead=_stat(lead.get(k, [])))
        for k in sorted({key(b) for b in closed})
    ]


def _delivery(
    scope: list[ReportBead], closed: list[ReportBead], now: datetime, days: int, sprint: str | None
) -> DeliverySection:
    counts: dict[str, Counter[str]] = defaultdict(Counter)
    for bead in closed:
        counts[_week(_closed_at(bead).date())][bead.issue_type] += 1
    if sprint is None:
        weeks = _weeks((now - timedelta(days=days)).date(), now.date())
    else:
        dates = [_closed_at(b).date() for b in closed]
        weeks = _weeks(min(dates), max(dates)) if dates else []
    active = [b for b in scope if b.status == "in_progress"]
    per_member = Counter(member_of(b) for b in active)
    oldest = sorted(active, key=lambda b: (b.started_at or b.updated_at, b.id))[:OLDEST]
    estimates = [
        EstimateRow(
            project=b.project, id=b.id, title=b.title,
            estimate_days=round(b.estimated_minutes / WORKDAY_MINUTES, 1),
            actual_days=_weekdays((b.started_at or b.created_at).date(), _closed_at(b).date()),
        )
        for b in closed
        if b.issue_type == "epic" and b.estimated_minutes
    ]
    return DeliverySection(
        weeks=[WeekRow(week=w, counts=dict(counts.get(w, Counter()))) for w in weeks],
        by_type=_times(closed, lambda b: b.issue_type),
        by_member=_times(closed, member_of),
        wip=[WipRow(member=m, count=c) for m, c in sorted(per_member.items(), key=lambda x: (-x[1], x[0]))],
        oldest=[
            WipBead(
                project=b.project, id=b.id, title=b.title, assignee=b.assignee,
                age_days=round((now - (b.started_at or b.updated_at)).total_seconds() / DAY, 1),
            )
            for b in oldest
        ],
        estimates=estimates,
    )


def _quality_row(key: str, project: str | None, title: str | None, rows: list[Measured]) -> QualityRow:
    qs = [m.own.quality for m in rows]
    return QualityRow(
        key=key, project=project, title=title, beads=len(qs),
        reopens=sum(q.reopens for q in qs), bugs=sum(q.bugs for q in qs),
        review_cycles=sum(q.review_cycles for q in qs), rejections=sum(q.rejections for q in qs),
        waivers=sum(q.waivers for q in qs),
        findings=Findings(
            critical=sum(q.findings.critical for q in qs), important=sum(q.findings.important for q in qs),
            minor=sum(q.findings.minor for q in qs), suggestion=sum(q.findings.suggestion for q in qs),
        ),
        rework_rate=_rate(qs),
    )


def _quality(tree: _Tree, measured: list[Measured]) -> QualitySection:
    members = [
        _quality_row(name, None, None, [m for m in measured if member_of(m.bead) == name])
        for name in sorted({member_of(m.bead) for m in measured})
    ]
    epics = [
        _quality_row(key[1], key[0], tree.index[key].title, rows)
        for key, rows in sorted(_by_epic(tree, measured).items())
    ]
    points = [
        Point(
            project=m.bead.project, id=m.bead.id, title=m.bead.title, tokens=tokens_of(m.own),
            rework=m.own.quality.reopens + m.own.quality.bugs + m.own.quality.rejections,
        )
        for m in measured
        if m.bead.issue_type != "epic"
    ]
    return QualitySection(members=members, epics=epics, points=points)


def _coverage(closed: list[ReportBead], measured: list[Measured]) -> Coverage:
    total = sum(tokens_of(m.own) for m in measured)
    unassigned = sum(tokens_of(m.own) for m in measured if member_of(m.bead) == UNASSIGNED)
    return Coverage(
        not_collected=[
            CoverageBead(project=b.project, id=b.id, title=b.title, detail=f"gin-workflow usage collect --bead {b.id}")
            for b in closed
            if b.usage is None and b.usage_problem is None
        ],
        invalid=[
            CoverageBead(project=b.project, id=b.id, title=b.title, detail=b.usage_problem)
            for b in closed
            if b.usage_problem is not None
        ],
        unpriced=sorted({name for m in measured for name in m.raw.unpriced}),
        unassigned_share=round(unassigned / total, 4) if total else None,
        sources=[
            SourceIssue(
                project=m.bead.project, id=m.bead.id, title=m.bead.title,
                sources=m.raw.sources, skipped_lines=m.raw.skipped_lines,
            )
            for m in measured
            if m.raw.skipped_lines > 0 or any(v != "ok" for v in m.raw.sources.values())
        ],
    )


def build_report(
    beads: list[ReportBead], *, now: datetime, project: str, days: int, sprint: str | None,
    errors: list[ProjectError],
) -> Report:
    tree = _Tree(beads)
    if sprint is None:
        scope = beads
        since = now - timedelta(days=days)
        closed = [b for b in beads if b.status == "closed" and b.closed_at is not None and b.closed_at >= since]
    else:
        roots = {_key(b) for b in beads if b.issue_type == "epic" and f"sprint:{sprint}" in b.labels}
        scope = [b for b in beads if tree.under(b, roots)]
        closed = [b for b in scope if b.status == "closed" and b.closed_at is not None]
    closed.sort(key=_key)
    measured = [
        Measured(b, b.usage, own) for b in closed if b.usage is not None and (own := tree.own(b)) is not None
    ]
    return Report(
        generated_at=now, project=project, days=days, sprint=sprint,
        totals=_totals(closed, measured),
        usage=_usage(tree, closed, measured),
        delivery=_delivery(scope, closed, now, days, sprint),
        quality=_quality(tree, measured),
        coverage=_coverage(closed, measured),
        errors=errors,
    )
```

Run the service tests → pass. Then `uv run --directory backend ruff check . && uv run --directory backend ruff format --check src/gin_console/reports tests && uv run --directory backend mypy` → clean (let `ruff format` reflow the long import and argument lines above; keep the logic as written).

- [ ] **Step 7: Commit** on the track branch: `feat(reports): report models, bd source and section builder (gin-console-ce5)`.

### Track 2: Reports API
- **Dependencies**: Track 1
- **Requirements**: REQ-REPORTS-001, REQ-REPORTS-007
- **Files**:
  - Create `backend/src/gin_console/reports/router.py`
  - Modify `backend/src/gin_console/app.py:12-23,49-53` (import and include the reports router)
  - Test `backend/tests/test_reports_api.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a router in the shape of `beads/router.py` with the code below; edge cases are input validation, partial failure and caching, all listed.
- **Acceptance criteria**: every scenario of REQ-REPORTS-001 and REQ-REPORTS-007 has a passing test named with its REQ-ID; existing backend tests still pass; `ruff check` and `mypy` clean.
- **Estimated complexity**: medium

**Interfaces consumed**: `read_beads`, `build_report`, `ProjectError`, `Report` (Track 1); `BdRunner`, `BeadsError` (`beads/source.py`); `KeyedCache` (`beads/service.py`); `Settings` (`config.py`).
**Interfaces produced** (consumed by Track 3): `GET /api/reports?project=<name|all>&days=7|30|90&sprint=<name>` → 200 `Report` JSON; 404 empty body for an unknown project; 422 and 502 with `{"error": str}`.

- [ ] **Step 1: Failing tests.** Create `backend/tests/test_reports_api.py`, reusing the `Clock` shape of `test_beads_api.py` (`now = datetime(2026, 11, 2, 12, 0, tzinfo=UTC)`). `make(tmp_path, runners: dict[str, Any])` creates `tmp_path/"alpha"` and `tmp_path/"beta"`, configures both projects, and passes `run_bd=lambda args, cwd, **kw: runners[cwd.name](args, cwd, **kw)` to `create_app` (a `FakeBd` per project; `FakeBd(failure=BeadsError("boom"))` for a failing one). Tests:
  - REQ-REPORTS-001 default period: alpha beads closed 3, 20, 40 days before `now` → 200, `body["totals"]["closed"] == 2`, `body["days"] == 30`.
  - REQ-REPORTS-001 sprint: the sprint scenario of the spec through `?project=alpha&sprint=s7`.
  - REQ-REPORTS-001 cached: two requests 20 s apart (advance the clock) → one `bd` call and equal `generated_at`; a third request 61 s after the first → a second call.
  - REQ-REPORTS-001 bad input: `project=nope` → 404; `days=14` → 422 with `error`; `sprint=a b` → 422; `sprint=` → 422; none of them ran `bd` (`fake.calls == []`).
  - REQ-REPORTS-007 one project fails in all: beta `FakeBd(failure=BeadsError("boom"))` → 200, `body["errors"] == [{"project": "beta", "error": "boom"}]`, alpha's beads counted.
  - REQ-REPORTS-007 every project fails in all → 502 with `error` naming both projects.
  - REQ-REPORTS-007 single project fails: alpha failing, requested twice → both 502 and two `bd` calls.
  - REQ-REPORTS-007 all members merged: `ann` closes a 100-token bead in alpha and a 200-token bead in beta → one member row `ann` with `closed == 2`, `tokens == 300`.

Run: `uv run --directory backend pytest tests/test_reports_api.py` → 404 on every request (route missing).

- [ ] **Step 2: Router.** Create `backend/src/gin_console/reports/router.py`:

```python
"""GET /api/reports (spec REQ-REPORTS-001, REQ-REPORTS-007)."""

import re
from collections.abc import Callable
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from gin_console.beads.service import KeyedCache
from gin_console.beads.source import BdRunner, BeadsError
from gin_console.config import Settings
from gin_console.reports.models import ProjectError, Report, ReportBead
from gin_console.reports.service import build_report
from gin_console.reports.source import read_beads

TTL = timedelta(seconds=60)
ALL = "all"
PERIODS = {"7": 7, "30": 30, "90": 90}
_SPRINT = re.compile(r"[A-Za-z0-9._-]{1,100}")


def _message(exc: BeadsError | RecursionError) -> str:
    return str(exc) or "bd output was too deeply nested"


def build_router(settings: Settings, run: BdRunner, clock: Callable[[], datetime]) -> APIRouter:
    router = APIRouter()
    reports = KeyedCache[tuple[str, int, str | None], Report](TTL, clock)

    def fetch(project: str, days: int, sprint: str | None) -> Report:
        entries = settings.projects if project == ALL else [p for p in settings.projects if p.name == project]
        beads: list[ReportBead] = []
        errors: list[ProjectError] = []
        for entry in entries:
            if not entry.path.is_dir():
                errors.append(ProjectError(project=entry.name, error="project directory does not exist"))
                continue
            try:
                beads.extend(read_beads(run, entry.path, entry.name))
            except (BeadsError, RecursionError) as exc:
                if project != ALL:
                    raise
                errors.append(ProjectError(project=entry.name, error=_message(exc)))
        if project == ALL and entries and len(errors) == len(entries):
            raise BeadsError("; ".join(f"{e.project}: {e.error}" for e in errors))
        return build_report(beads, now=clock(), project=project, days=days, sprint=sprint, errors=errors)

    @router.get("/reports", response_model=Report)
    def get_report(
        project: str | None = None, days: str | None = None, sprint: str | None = None
    ) -> Report | JSONResponse:
        if project is None:
            raise HTTPException(status_code=404)
        if project != ALL:
            entry = next((p for p in settings.projects if p.name == project), None)
            if entry is None or not entry.path.is_dir():
                raise HTTPException(status_code=404)
        period = PERIODS.get(days or "30")
        if period is None:
            return JSONResponse(status_code=422, content={"error": "days must be 7, 30 or 90"})
        if sprint is not None and _SPRINT.fullmatch(sprint) is None:
            return JSONResponse(
                status_code=422,
                content={"error": "sprint may hold only letters, digits, '.', '_' and '-'"},
            )
        try:
            # a partial "all" answer is a success and is cached; a failure is not (KeyedCache)
            return reports.get((project, period, sprint), lambda: fetch(project, period, sprint))
        except (BeadsError, RecursionError) as exc:
            return JSONResponse(status_code=502, content={"error": _message(exc)})

    return router
```

- [ ] **Step 3: Wire it.** In `backend/src/gin_console/app.py` add `from gin_console.reports.router import build_router as build_reports_router` after the quota imports (keep ruff's import order), and after line 53 `api.include_router(build_milestones_router(settings, run_gw, clock))` add `api.include_router(build_reports_router(settings, run_bd, clock))`.

- [ ] **Step 4: Run** `uv run --directory backend pytest` (all backend tests) → pass; `uv run --directory backend ruff check . && uv run --directory backend mypy` → clean.

- [ ] **Step 5: Commit**: `feat(reports): GET /api/reports with per-project failures and a 60 s cache (gin-console-ce5)`.

### Track 3: Reports page, filters and states
- **Dependencies**: none (uses the shared interface; tests stub `fetch`)
- **Requirements**: REQ-UI-088, REQ-UI-093
- **Files**:
  - Modify `frontend/package.json`, `frontend/pnpm-lock.yaml` (add `recharts@3.10.1`, `react-is@19`)
  - Modify `frontend/src/index.css:29,84,127` (series color tokens)
  - Modify `frontend/src/app/App.tsx:1-11,70-80` (lazy `/reports` route)
  - Create `frontend/src/features/reports/api.ts`
  - Create `frontend/src/features/reports/filters.ts`
  - Create `frontend/src/features/reports/format.ts`
  - Create `frontend/src/features/reports/reportFixtures.ts`
  - Create `frontend/src/features/reports/ReportsPage.tsx`
  - Create `frontend/src/features/reports/KpiRow.tsx`
  - Test `frontend/src/features/reports/api.test.ts`
  - Test `frontend/src/features/reports/filters.test.ts`
  - Test `frontend/src/features/reports/ReportsPage.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a page in the shape of `BeadsPage.tsx` (project list, URL-bound filters) plus a fetch client; state handling (late answers, retry, partial errors) is listed in the spec.
- **Acceptance criteria**: REQ-UI-088 and REQ-UI-093 scenarios pass in vitest with their REQ-IDs; `pnpm -C frontend typecheck`, `lint`, `test --run` and `build` pass; the build output lists a separate `ReportsPage-*.js` chunk.
- **Estimated complexity**: medium

**Interfaces produced** (consumed by Track 4):
- `api.ts`: TypeScript types `Report`, `Totals`, `UsageSection`, `MemberUsage`, `EpicUsage`, `Budget`, `BeadUsage`, `StageRow`, `ModelRow`, `DeliverySection`, `WeekRow`, `TimeRow`, `Stat`, `WipRow`, `WipBead`, `EstimateRow`, `QualitySection`, `QualityRow`, `Findings`, `Point`, `Coverage`, `CoverageBead`, `SourceIssue`, `ProjectError`, exactly as "Interfaces shared by all tracks" (`float|null` → `number | null`, `dict[str,int]` → `Record<string, number>`, `datetime` → `string`); `fetchReport(filters: ReportFilters): Promise<Report>`.
- `filters.ts`: `type Period = 7 | 30 | 90`, `PERIODS: readonly Period[]`, `type ReportFilters = { project: string; days: Period; sprint: string }`, `parseReportSearch(search: string): ReportFilters`, `reportSearch(filters: ReportFilters): string`.
- `format.ts`: `formatTokens(n: number): string` (`Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })`, so 51136800 → "51.1M"), `formatCost(cost: number | null): string` ("$12.34" or "no price"), `formatPercent(rate: number | null): string` ("25%" or "—"), `formatDays(days: number | null): string` ("3.4 d" or "—"), `beadPath(project: string, id: string): string` (`/beads/<enc project>/<enc id>`).
- `reportFixtures.ts`: `report(overrides?: Partial<Report>): Report` with one member, one epic, one bead, two stages, one model row, one week, one point, empty coverage and errors.
- `ReportsPage.tsx`: renders `<KpiRow totals={…} />` and, after it, a `<div data-testid="report-sections">` whose children Track 4 fills with the four sections.
- CSS tokens `--color-series-1` … `--color-series-8` (Tailwind `fill-series-N`/`bg-series-N`, and `var(--color-series-N)` in Recharts props).

- [ ] **Step 1: Dependency.** `pnpm -C frontend add recharts@3.10.1 react-is@19` → `package.json` and `pnpm-lock.yaml` change.

- [ ] **Step 2: Series tokens.** The eight categorical colors come from the dataviz reference palette, validated on 2026-11-01 against this app's surfaces with `validate_palette.js` (light on `#f6f7f9`: all checks pass, contrast WARN for slots 2–5 → every chart has a table next to it; dark on `#0e1217`: all pass). In `frontend/src/index.css`:
  - after line 29 (`--color-chart-1` … block inside `@theme inline`) add `--color-series-1: var(--series-1);` … `--color-series-8: var(--series-8);`
  - after line 84 (`--chart-5` in `:root`) add `--series-1: #2a78d6; --series-2: #eb6834; --series-3: #1baf7a; --series-4: #eda100; --series-5: #e87ba4; --series-6: #008300; --series-7: #6250d6; --series-8: #e34948;` (one per line)
  - after line 127 (`--chart-5` in `.dark`) add `--series-1: #3987e5; --series-2: #d95926; --series-3: #199e70; --series-4: #c98500; --series-5: #d55181; --series-6: #008300; --series-7: #9085e9; --series-8: #e66767;`

- [ ] **Step 3: Failing tests.**
  - `filters.test.ts` (REQ-UI-088): `parseReportSearch("?project=all&days=7")` → `{ project: "all", days: 7, sprint: "" }`; `days=14` or missing → 30; `reportSearch({ project: "alpha", days: 90, sprint: "" })` → `"?project=alpha&days=90"`; with sprint `s7` → `"?project=alpha&days=90&sprint=s7"`; values are URL-encoded.
  - `api.test.ts` (REQ-UI-088, REQ-UI-093): `fetchReport` requests `/api/reports?project=alpha&days=30` (no `sprint` when empty) and returns the fixture; a 502 `{"error": "boom"}` rejects with message `boom`; a 404 rejects with `Project not found`; a body without `totals` rejects with `Could not load the report (unexpected response)`.
  - `ReportsPage.test.tsx`, stubbing `fetch` to answer `/api/projects` with projects `alpha` and `beta` (shape of `fetchProjects`, `exists: true`) and `/api/reports` per URL:
    - REQ-UI-088 shared link: start at `/reports?project=all&days=7` → the project select shows "All projects", the 7-day option is pressed (`aria-pressed="true"`), and `fetch` was called with `/api/reports?project=all&days=7`.
    - REQ-UI-088 default and change period: start at `/reports` → requests `project=alpha&days=30`; click "90 days" → `window.location.search === "?project=alpha&days=90"` and a request with `days=90`.
    - REQ-UI-088 sprint: type `s7` in the "Sprint" field and press Enter → URL gains `&sprint=s7` and the request has `sprint=s7`.
    - REQ-UI-088 KPI row: the fixture's totals show as "Tokens", "Estimated cost" (or "no price" when `cost` is null), "Closed beads", "Tokens per bead", "Rework rate".
    - REQ-UI-093 loading: before the report answers, "Loading report…" is shown.
    - REQ-UI-093 error with Retry: a 502 `{"error": "boom"}` shows "boom" and a "Retry" button; clicking it requests again and shows the KPI row.
    - REQ-UI-093 partial failure: `errors: [{ project: "beta", error: "bd failed" }]` shows a warning containing "beta" and "bd failed" and the KPI row.
    - REQ-UI-093 late answer: the 30-day request resolves only after the user picked 7 days and the 7-day answer arrived → the KPI row shows the 7-day totals.
  - Run `pnpm -C frontend test --run src/features/reports` → fails (modules missing).

- [ ] **Step 4: `filters.ts`, `format.ts`, `api.ts`, `reportFixtures.ts`.** `fetchReport` builds `URLSearchParams({ project, days: String(days) })`, adds `sprint` only when not empty, and maps a non-OK answer like `features/beads/api.ts` `failure()` does (404 → `Error("Project not found")`, else the body's `error` or `HTTP <status>`). The guard `isReport` checks with `field()` from `@/lib/guards` that `generated_at` is a string, `totals` has numeric `tokens` and `closed`, `usage.members`, `usage.epics`, `usage.beads`, `usage.stages`, `usage.models`, `delivery.weeks`, `delivery.by_type`, `delivery.by_member`, `delivery.wip`, `delivery.oldest`, `delivery.estimates`, `quality.members`, `quality.epics`, `quality.points`, `coverage.not_collected`, `coverage.invalid`, `coverage.unpriced`, `coverage.sources` and `errors` are arrays. (Ponytail: the guard checks the shape down to the arrays, not every row field; the backend's pydantic model owns the rows.)

- [ ] **Step 5: `KpiRow.tsx` and `ReportsPage.tsx`.**
  - `KpiRow({ totals }: { totals: Totals })`: five tiles in a `grid grid-cols-2 gap-3 md:grid-cols-5`, each a label (`text-xs text-muted-foreground`) and a value (`text-2xl font-semibold tabular-nums`): Tokens `formatTokens`, Estimated cost `formatCost`, Closed beads, Tokens per bead (`formatTokens` or "—"), Rework rate `formatPercent`.
  - `ReportsPage()`: load the project names as `BeadsPage.tsx` lines 15–33 do (`fetchProjects`, keep `exists`); `const filters = parseReportSearch(search)`; selected project = `filters.project` when it is `"all"` or a known name, else the first name. Filter bar in one row: a native `<select aria-label="Project">` with each name and `<option value="all">All projects</option>`; three `Button`s "7 days", "30 days", "90 days" with `aria-pressed`; a `<form>` holding `<input aria-label="Sprint" placeholder="Sprint">` whose submit navigates. Every change calls `navigate(\`/reports${reportSearch(next)}\`, { replace: true })`.
  - Loading the report: one `useEffect` keyed on `selected`, `filters.days`, `filters.sprint` and a `attempt` counter; it sets `{ status: "loading" }`, calls `fetchReport`, and stores the answer only while the effect is still current (`let live = true; return () => { live = false; }`), which drops late answers.
  - States: loading → `<p>Loading report…</p>`; error → `Alert` with the message and a "Retry" `Button` that increments `attempt`; ok → when `errors.length > 0` an `Alert` titled "Some projects could not be read" listing `project: error`, then `<KpiRow />`, then `<div data-testid="report-sections" className="flex flex-col gap-8" />`.
  - A page heading `<h1>Reports</h1>` and, under it, `Generated <time>` from `generated_at`.

- [ ] **Step 6: Lazy route.** In `frontend/src/app/App.tsx`: `import { lazy, Suspense } from "react";`, `const ReportsPage = lazy(() => import("@/features/reports/ReportsPage").then((m) => ({ default: m.ReportsPage })));`, and before the `/quota` branch add `pathname === "/reports" ? (<Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}><ReportsPage /></Suspense>) :`. Add to `ReportsPage.test.tsx` a case rendering `<App />` at `/reports` that finds the "Reports" heading (REQ-UI-088).

- [ ] **Step 7: Run** `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build` → pass, and `ls frontend/dist/assets | grep ReportsPage` lists one chunk.

- [ ] **Step 8: Commit**: `feat(reports): Reports page with URL filters, KPI row and load states (gin-console-ce5)`.

### Track 4: Report sections with charts
- **Dependencies**: Track 3
- **Requirements**: REQ-UI-089, REQ-UI-090, REQ-UI-091, REQ-UI-092, REQ-UI-093
- **Files**:
  - Create `frontend/src/features/reports/ChartBox.tsx`
  - Create `frontend/src/features/reports/colors.ts`
  - Create `frontend/src/features/reports/UsageSection.tsx`
  - Create `frontend/src/features/reports/DeliverySection.tsx`
  - Create `frontend/src/features/reports/QualitySection.tsx`
  - Create `frontend/src/features/reports/CoverageSection.tsx`
  - Modify `frontend/src/features/reports/ReportsPage.tsx` (render the four sections inside `report-sections`)
  - Test `frontend/src/features/reports/sections.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** four presentational components over typed data with Recharts; chart rules and test hooks are fixed below.
- **Acceptance criteria**: REQ-UI-089 to 092 scenarios and REQ-UI-093's "No data in this period" pass in vitest with their REQ-IDs; typecheck, lint, test and build pass.
- **Estimated complexity**: medium

**Interfaces consumed**: everything Track 3 produces; `CopyCommand` from `@/features/milestones/CopyCommand`; `Link` from `@/app/Link`; `navigate` from `@/app/route`; `Table*` from `@/components/ui/table`; `Badge` from `@/components/ui/badge`.

- [ ] **Step 1: Failing tests.** `sections.test.tsx` renders each section with `report()` from `reportFixtures.ts`:
  - REQ-UI-089 members: a report with members `ann` and `Unassigned` → the members chart has a `.recharts-bar-rectangle` per member and stage present, the legend names each stage present, and the table rows show member, closed beads, tokens, cost, tokens per bead and cache ratio.
  - REQ-UI-089 epics and beads: the epic table links `/beads/alpha/e-1`, shows `3/4` children closed and the budget status text when `budget` is set; the top beads table lists the fixture bead.
  - REQ-UI-089 stages and models: the stage share bar names each stage with its percentage; the model table shows model, role, input, output, cache read, cache write, tokens, cost.
  - REQ-UI-090 delivery: the weeks chart renders one column group per week; the cycle/lead tables show median and p85 per type and per member; WIP shows `ann 2` and the oldest beads with "10.0 d", each linking to its bead page; with `estimates: []` no "Estimate vs actual" heading exists.
  - REQ-UI-091 open a point: a point for `a-3` of `alpha`; clicking the first `.recharts-scatter-symbol` sets `window.location.pathname` to `/beads/alpha/a-3`.
  - REQ-UI-092 copy command: coverage with `not_collected: [{ project: "alpha", id: "a-9", title: "t", detail: "gin-workflow usage collect --bead a-9" }]` → after clicking its "Copy" button, the stubbed `navigator.clipboard.writeText` received that command; unpriced models, the unassigned share, source issues and the fixed note "Estimates from local Claude Code and Codex logs on the machine that collected them. Antigravity and OpenCode are not measured." are shown.
  - REQ-UI-093 empty: a report with empty `usage.members`, `delivery.weeks` counts all zero and empty `quality.points` → each section shows "No data in this period" and no `.recharts-surface`.
  - Run → fails (modules missing).

- [ ] **Step 2: `ChartBox.tsx` and `colors.ts`.**
  - `ChartBox({ height, children }: { height: number; children: ReactElement })` returns `<ResponsiveContainer width="100%" height={height} initialDimension={{ width: 640, height }}>{children}</ResponsiveContainer>` so charts render in jsdom without mocks.
  - `colors.ts`: `export const STAGES = ["discuss", "plan", "orchestrate", "execute", "review", "verify", "ship", "quick"] as const;` `stageColor(stage)` → `var(--color-series-${index + 1})` for those eight in that fixed order, `var(--color-muted-foreground)` for any other stage; `TYPES = ["task", "feature", "bug", "epic", "chore", "decision"] as const` with `typeColor(type)` the same way (series 1–6), others muted. Color follows the entity, never its rank.
  - Every Recharts series sets `isAnimationActive={false}`, bars use `radius={[0, 4, 4, 0]}` (horizontal) or `[4, 4, 0, 0]` (columns) on the outer segment only, a `stroke="var(--color-background)"` `strokeWidth={2}` gap between stacked segments, grid `stroke="var(--color-border)"`, axis ticks `fill="var(--color-muted-foreground)"`, a `Legend` whenever there are two or more series, and a `Tooltip` with `contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)" }}`. Values in text use text tokens, never the series color.

- [ ] **Step 3: `UsageSection.tsx`** (`{ usage }: { usage: UsageSection }`), heading "AI usage":
  - Members: `BarChart layout="vertical"` with `data = members.map(m => ({ member: m.member, ...m.stages }))`, `YAxis type="category" dataKey="member"`, `XAxis type="number" tickFormatter={formatTokens}`, one `<Bar dataKey={stage} stackId="s" fill={stageColor(stage)} />` per stage present in any member, in `STAGES` order then others; height `40 + 36 * members.length`. Then a table: Member, Closed, Tokens, Est. cost, Tokens/bead, Cache ratio.
  - Top epics table: Epic (`Link` to `beadPath`), Project (only when the report's project is `all`; pass `project` as a prop), Tokens, Est. cost, Children (`closed/children`), Budget (`Badge` with `budget.status` and `formatCost(budget.cost)` of `$budget_usd`, or nothing).
  - Top beads table: Bead (link), Type, Assignee (or "Unassigned"), Tokens, Est. cost.
  - Stage share: `BarChart layout="vertical" stackOffset="expand"` with one row `{ name: "stages", [stage]: tokens }`, one stacked `Bar` per stage, height 72, plus a list `stage — NN% (formatTokens)`.
  - Models table: Model, Role, Input, Output, Cache read, Cache write, Tokens, Est. cost.
  - Empty when `members.length === 0`: the section shows only "No data in this period".

- [ ] **Step 4: `DeliverySection.tsx`** (`{ delivery }`), heading "Delivery flow":
  - Weeks: `BarChart` with `data = weeks.map(w => ({ week: w.week, ...w.counts }))`, one stacked `Bar` per issue type present (`TYPES` order, then others), `XAxis dataKey="week"`, height 240. Empty when every count is 0.
  - Two tables "Cycle and lead time by type" and "by member": Key, Beads (`cycle?.n ?? lead?.n ?? 0`), Cycle median, Cycle p85, Lead median, Lead p85, with `formatDays`.
  - "Work in progress": table Member, In progress; then "Oldest in progress": Bead (link), Assignee, Age (`formatDays`).
  - "Estimate vs actual" (only when `estimates.length > 0`): Epic (link), Estimate (days), Actual (working days).

- [ ] **Step 5: `QualitySection.tsx`** (`{ quality }`), heading "Quality and rework":
  - Tables "By member" and "By epic" (epic key links to its bead page): Beads, Reopens, Bugs, Review cycles, Rejections, Waivers, Findings (`C/I/M/S`), Rework rate.
  - Scatter: `ScatterChart` with `XAxis type="number" dataKey="tokens" name="Tokens" tickFormatter={formatTokens}`, `YAxis type="number" dataKey="rework" name="Rework" allowDecimals={false}`, one `<Scatter data={points} fill="var(--color-series-1)" onClick={(p) => navigate(beadPath(p.project, p.id))} isAnimationActive={false} />`, `Tooltip` whose content shows `id — title`, `tokens`, `rework`; `accessibilityLayer` stays on (Recharts default) so keyboard focus shows the tooltip. Height 280. Empty when `points.length === 0`.

- [ ] **Step 6: `CoverageSection.tsx`** (`{ coverage, errors }`), heading "Data coverage":
  - "Not collected" list: `id — title` and `<CopyCommand command={detail} />`.
  - "Unreadable usage" list: `id — detail`.
  - "Models without a price: m1, m2. Add them to `.agent-workflow/usage-prices.yaml`." when `unpriced` is not empty.
  - "Unassigned share of tokens: NN%" (`formatPercent`).
  - "Log sources" list: `id`, each source not `ok` as `name: value`, and `skipped_lines` when above 0.
  - "Projects that failed" list from `errors`.
  - Always, last: the fixed note sentence of REQ-UI-092.

- [ ] **Step 7: Mount** in `ReportsPage.tsx` inside `report-sections`: `<UsageSection usage={report.usage} project={report.project} />`, `<DeliverySection delivery={report.delivery} />`, `<QualitySection quality={report.quality} />`, `<CoverageSection coverage={report.coverage} errors={report.errors} />`.

- [ ] **Step 8: Run** `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` → pass; the Recharts code is in the `ReportsPage-*.js` chunk, not in `index-*.js` (`grep -l recharts frontend/dist/assets/*.js` names only the Reports chunk or a chunk it imports).

- [ ] **Step 9: Commit**: `feat(reports): usage, delivery, quality and coverage sections with charts (gin-console-ce5)`.

### Track 5: Navigation: Reports in, Sessions out
- **Dependencies**: none
- **Requirements**: REQ-UI-008, REQ-UI-055, REQ-UI-057
- **Files**:
  - Modify `frontend/src/app/Layout.tsx:1,12` (Sessions entry → Reports)
  - Test `frontend/src/app/Layout.test.tsx:20-46` (expected links and current-link table)
  - Test `frontend/src/app/App.test.tsx:42-54` (REQ-UI-008 case)
- **Provider role**: `frontend`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** one array entry and test expectations, all given below.
- **Acceptance criteria**: the updated REQ-UI-008, 055 and 057 tests pass; every other frontend test passes; typecheck and lint clean.
- **Estimated complexity**: low

- [ ] **Step 1: Failing tests.**
  - `Layout.test.tsx` REQ-UI-055: expected links become `["Projects", "/"], ["Beads", "/beads"], ["Milestones", "/milestones"], ["Reports", "/reports"], ["Quota", "/quota"]`.
  - `Layout.test.tsx` REQ-UI-057 table: replace `["/sessions", ["Sessions"]]` and the `/sessions/alpha/<uuid>` row with `["/sessions", []]` and `["/sessions/alpha/11111111-1111-4111-8111-111111111111", []]`; add `["/reports", ["Reports"]]` and `["/reportsx", []]`.
  - `App.test.tsx` REQ-UI-008: rename to `"REQ-UI-008 opens the session list by URL without a Sessions link and follows back"`; start at `/`, then `act(() => navigate("/sessions"))` (import `navigate` from `./route`), expect "no sessions found", `screen.queryByRole("link", { name: "Sessions" })` to be null, then `window.history.back()` returns to the Projects page at `/`.
  - Run `pnpm -C frontend test --run src/app` → the three cases fail.

- [ ] **Step 2: Code.** In `frontend/src/app/Layout.tsx` replace `MessageSquare` with `ChartColumn` in the `lucide-react` import, and replace line 12 with `{ to: "/reports", label: "Reports", icon: ChartColumn, current: (path: string) => path === "/reports" },`.

- [ ] **Step 3: Run** `pnpm -C frontend test --run`, `typecheck`, `lint` → pass.

- [ ] **Step 4: Commit**: `feat(ui): Reports replaces Sessions in the Main navigation (gin-console-ce5)`.

### Track 6: Browser check on the Tailscale deployment
- **Dependencies**: Track 2, Track 4, Track 5
- **Requirements**: REQ-UI-008, REQ-UI-055, REQ-UI-057, REQ-UI-088, REQ-UI-089, REQ-UI-091, REQ-REPORTS-007 (manual cases TC-1 to TC-4 of `05-tests.md`)
- **Files**:
  - Modify `docs/changes/gin-console-ce5-team-reports/05-tests.md` (evidence column)
- **Provider role**: `general`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** run the recorded deploy commands, then a person checks the pages; no code.
- **Human gate**: the user opens `https://instance-20260515-2304.tail5ca54e.ts.net:8443/reports` and confirms TC-1 to TC-4 in a browser (light and dark, 390px width).
- **Acceptance criteria**: the deploy commands succeed (`systemctl --user is-active gin-console` prints `active`, `/api/health` returns 200); the user confirms each TC; their answers and the date are written in the evidence column.
- **Estimated complexity**: low

- [ ] **Step 1: Deploy** (bd memory `deploy-to-tailscale-for-ui-verification`, each as a separate command): `git -C /home/gin/gin-fam/gin-console merge --ff-only <integration branch>`; `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`; `pnpm -C /home/gin/gin-fam/gin-console/frontend build`; `systemctl --user restart gin-console`; `systemctl --user is-active gin-console`; `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health`. Report the rollback command `git -C /home/gin/gin-fam/gin-console reset --hard <previous master commit>` followed by the same build and restart.
- [ ] **Step 2: Ask** the user to run TC-1 to TC-4 and wait for their answer (`gin-workflow notify --event needs_input`).
- [ ] **Step 3: Record** each answer in the evidence column of `05-tests.md` and commit: `docs(specs): record gin-console-ce5 browser check`.

## Requirement coverage

| REQ | Track |
|---|---|
| REQ-REPORTS-001 | 2 (service part also tested in 1) |
| REQ-REPORTS-002 to 006 | 1 |
| REQ-REPORTS-007 | 2 |
| REQ-UI-088 | 3, 6 |
| REQ-UI-089, 090, 091, 092 | 4 (089, 091 also 6) |
| REQ-UI-093 | 3 (states), 4 (empty sections) |
| REQ-UI-008, 055, 057 (modified) | 5, 6 |

## Integration
- **Branch**: `feat/gin-console-ce5-team-reports` from `master` after the spec branch `spec/gin-console-ce5-team-reports` is merged into it; each track works on its own worktree branch and merges back into it.
- **Merge strategy**: parallel-then-merge (Tracks 1, 3, 5 together; then 2 and 4; then 6).

## Validation
- [ ] `uv run --directory backend pytest` passes
- [ ] `uv run --directory backend ruff check .` and `uv run --directory backend mypy` clean
- [ ] `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build` pass; Recharts only in the Reports chunk
- [ ] `gin-workflow specs lint --change gin-console-ce5` and `gin-workflow specs trace --change gin-console-ce5` show no missing REQ
- [ ] Manual verification: TC-1 to TC-4 in `05-tests.md` confirmed by the user (Track 6)

## Notes
- `Model:` and `Effort:` are chosen from the main harness catalog (`haiku`, `sonnet`, `opus`; `low` … `max`) using the route rubric.
- The user may override `Model:` and `Effort:` before plan approval.
- Provider roles describe responsibility rather than filename patterns.
- Deliverable merge-holds (e.g. "remain open until human-confirmed merge") apply exclusively to the Parent Bead `gin-console-ce5`. Track beads close upon passing tests and code review to unblock dependent tracks.
