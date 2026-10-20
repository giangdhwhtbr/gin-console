# Plan: Browse beads

Epic: gin-console-rm-beads-native
Spec: docs/changes/gin-console-rm-beads-native-browse/ (proposal.md, spec-delta.md, design.md, tests.md)

This is change A of three under the epic (A browse, B Board and Focus, C Scotty parity and retirement). Shipping it must NOT close the epic.

## Objective

Beads of any configured project can be listed, searched, filtered and opened inside the console: read-only `GET /api/beads` and `GET /api/beads/{project}/{id}` over the `bd` CLI, a Beads list page and a bead page, and the epics on the Projects page open the console's own bead page.

## Goal, Architecture, Tech Stack (from the spec)

- Goal: view, search and filter beads natively in the console (change A of the epic that ends with retiring Scotty).
- Architecture: a new backend context `beads/` next to `projects/`, `sessions/` and `quota/`. `source.py` is the only module that knows the `bd` JSON shapes and returns the console's own pydantic models; `service.py` is a small keyed cache; `router.py` serves the two endpoints. The command runner of `projects/collect.py` is reused (made public). The React side adds a data layer with URL-held filters, a list page and a detail page, with history-API routing and no new dependency.
- Tech stack: Python 3.12, FastAPI, pydantic v2, pytest, ruff, mypy; React, TypeScript, Tailwind, shadcn/ui, vitest, Testing Library.

## Global Constraints

- Read-only: only `bd list`, `bd show` and `bd dep list` run, with fixed arguments, in the project directory; a bead id is validated before it can reach an argument list and is placed after `--`; nothing is ever created, updated, closed or deleted.
- Single machine, Tailscale-only access; no authentication.
- Non-goals: Board and Focus views, lanes, grouping by assignee (change B); Scotty parity sign-off and retirement, removing the Scotty link on project names, the Tailscale change (change C); dependency graph, comment text, Markdown rendering, searching descriptions, merging several projects in one list, any write.
- Titles, labels and descriptions are written by people and agents: render them as plain text only.
- Automated tests carry the REQ-ID in the test name or a comment.

## Model Guidance
- `default_model_class`: `standard_impl`
- `phase_guidance`:
  - `brainstorm`: `high_reasoning`
  - `design`: `high_reasoning`
  - `plan`: `standard_impl`
  - `implement`: `standard_impl`
  - `review`: `high_reasoning`
  - `docs`: `cheap_simple`
- `override_rule`: Use `high_reasoning` for planning only when execution boundaries, dependency sequencing, or major tradeoffs are still unresolved.

## Requirement Analysis
- Problem statement: the console shows a Beads summary per project but sends the user to Scotty to see a single bead.
- Success criteria: every scenario in `spec-delta.md` has a passing test; `verify.checks` pass; on the live host `/beads` lists the unfinished beads of qwikfone and gin-workflow, search and filters work, a bead opens with its relations, and the epics on the Projects page open inside the console.
- Constraints and non-goals: see Global Constraints.

## Approach Options
### Option 1: Run `bd ... --json` on demand, cache 5 seconds (selected in discuss)
- Summary: same interface the dashboard already uses; the list and detail endpoints shell out to `bd`.
- Pros: independent of Dolt's internal schema (bd 1.3.1 could not read the existing project databases); one tested runner.
- Cons: about 1.3 s for the largest project's full list (the default open-only list is much smaller).

### Option 2: Read Dolt with SQL, or `.beads/issues.jsonl`
- Pros: fast and flexible queries.
- Cons: tied to the schema, or a passive export that can be stale.

### Recommended Approach
- Selected option: Option 1.
- Reasoning: confirmed in discuss.

## Scope
- In scope: REQ-BEADS-001..006, REQ-UI-022..029, modified REQ-UI-005.
- Out of scope: everything under non-goals.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Five tracks in a dependency chain (bd source, service and API, frontend data layer, list page, detail page and dashboard link); each needs the previous one's interface, so one agent working in order is simplest.
```

## Verified facts about `bd` (checked on this host; the code below relies on them)

- `bd list --limit 0 --json` returns every unfinished bead (gates, infrastructure beads and templates are hidden); `--all` adds closed beads. Optional keys are simply absent: `labels` (no labels), `owner`, `assignee`, `parent`, `description`, `notes`, `dependencies` (in list output these are `{issue_id, depends_on_id, type}` rows that this change ignores).
- `bd show --json -- <id>` returns a one-element list. Its `dependencies` are full bead objects (`id`, `title`, `status`, `priority`, ...) each with `dependency_type` (`blocks` or `parent-child`); there is NO `dependents` key (only `dependent_count`).
- `bd dep list --direction up --json -- <id>` returns the beads that depend on `<id>`, same shape with `dependency_type`: `blocks` rows are what the bead blocks, `parent-child` rows are its children (closed ones included).
- An unknown id makes `bd show` and `bd dep list` exit 1 and print JSON `{"error": "... no issue(s) found matching ...", "schema_version": 1}` on stdout. All flags must come before `--`.

## File Map

| File | Responsibility | Track |
|---|---|---|
| `backend/src/gin_console/projects/collect.py` (modify) | `_run_json` becomes public `run_json` with a `timeout` argument | 1 |
| `backend/src/gin_console/beads/__init__.py` (create) | package marker | 1 |
| `backend/src/gin_console/beads/models.py` (create) | `BeadSummary`, `BeadDetail`, `Relation` | 1 |
| `backend/src/gin_console/beads/source.py` (create) | run `bd`, parse, map errors | 1 |
| `backend/tests/fake_bd.py` (create) | fake `bd` runner for tests | 1 |
| `backend/tests/test_beads_source.py` (create) | REQ-BEADS-002, 003, 005, 006 at the source level | 1 |
| `backend/src/gin_console/beads/service.py` (create) | `KeyedCache` | 2 |
| `backend/src/gin_console/beads/router.py` (create) | `GET /api/beads`, `GET /api/beads/{project}/{id}` | 2 |
| `backend/src/gin_console/app.py` (modify) | include the router; `run_bd` parameter | 2 |
| `backend/tests/test_beads_service.py`, `test_beads_api.py` (create) | REQ-BEADS-001..006 over HTTP | 2 |
| `frontend/src/app/route.ts` (modify) | `navigate(to, { replace })` | 3 |
| `frontend/src/features/beads/{api.ts,filters.ts}` (create) | types, guards, fetchers; URL filters, filtering, sorting | 3 |
| `frontend/src/features/beads/{api.test.ts,filters.test.ts}` (create) | tests | 3 |
| `frontend/src/features/beads/{BeadsPage,BeadList,BeadFilterBar,BeadTable}.tsx` (create) | list page | 4 |
| `frontend/src/app/{Layout,App}.tsx`, `App.test.tsx` (modify) | link and routes | 4 |
| `frontend/src/features/beads/BeadsPage.test.tsx` (create) | tests | 4 |
| `frontend/src/features/beads/BeadDetailPage.tsx`, `BeadDetailPage.test.tsx` (create) | bead page | 5 |
| `frontend/src/features/projects/{ProjectCard.tsx,ProjectsPage.test.tsx}` (modify) | epic links open the console's bead page | 5 |

## Tasks

### Track 1: bd source
- **Dependencies**: none
- **Requirements**: REQ-BEADS-002, REQ-BEADS-003, REQ-BEADS-005, REQ-BEADS-006 (mapping, validation, failures and cleaning at the source level; the HTTP side is Track 2)
- **Files**: modify `backend/src/gin_console/projects/collect.py`; create `backend/src/gin_console/beads/{__init__,models,source}.py`, `backend/tests/{fake_bd,test_beads_source}.py`
- **Provider role**: `backend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every source-level scenario has a passing test; the existing projects tests still pass after the rename; a malformed bead never fails a list; a bad id never reaches an argument list; `bd` errors become `BeadsError` or `BeadNotFound`, never another exception.
- **Estimated complexity**: medium

Interfaces produced: `run_json(cmd, cwd, json_on_failure=False, timeout=TIMEOUT_SECONDS)`, `BdRunner`, `run_bd`, `valid_id`, `list_beads(run, cwd, closed) -> list[BeadSummary]`, `get_bead(run, cwd, bead_id) -> BeadDetail`, `BeadsError`, `BeadNotFound`, models `BeadSummary`, `Relation`, `BeadDetail`.

- [ ] **Step 1: make the runner public.** In `projects/collect.py` rename `_run_json` to `run_json` (four call sites in the same file) and add a `timeout: float = TIMEOUT_SECONDS` parameter used in the `subprocess.run(..., timeout=timeout)` call. Behaviour for existing callers is unchanged; `uv --directory backend run pytest -q` must still be green (the existing projects tests cover this code).

- [ ] **Step 2: models** `beads/models.py` (`beads/__init__.py` stays empty). Strict validation means a wrong type makes the whole bead invalid instead of being coerced:

```python
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict

from gin_console.quota.source import clean

# lone surrogates are valid JSON escapes but cannot be encoded in a response
Text = Annotated[str, AfterValidator(clean)]


class BeadSummary(BaseModel):
    model_config = ConfigDict(strict=True)

    id: Text
    title: Text
    status: Text
    priority: int
    issue_type: Text
    labels: list[Text] = []
    owner: Text | None = None
    assignee: Text | None = None
    parent: Text | None = None
    created_at: Text
    updated_at: Text
    dependency_count: int = 0
    dependent_count: int = 0
    comment_count: int = 0


class Relation(BaseModel):
    model_config = ConfigDict(strict=True)

    id: Text
    title: Text
    status: Text
    type: Literal["blocks", "parent-child"]


class BeadDetail(BeadSummary):
    description: Text | None = None
    dependencies: list[Relation] = []
    dependents: list[Relation] = []
    children: list[Relation] = []
```

- [ ] **Step 3: fake runner** `backend/tests/fake_bd.py` (used by Tracks 1 and 2):

```python
"""A stand-in for the `bd` CLI: canned beads, same argument conventions as the real one."""

from pathlib import Path
from typing import Any

NO_ISSUE = {"error": "no issues found matching the provided IDs", "schema_version": 1}


def bead(ident: str = "p-1", **overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "id": ident,
        "title": f"Title of {ident}",
        "description": "",
        "status": "open",
        "priority": 2,
        "issue_type": "task",
        "owner": "me@example.com",
        "created_at": "2026-10-11T10:00:00Z",
        "created_by": "me",
        "updated_at": "2026-10-12T10:00:00Z",
        "dependency_count": 0,
        "dependent_count": 0,
        "comment_count": 0,
    }
    base.update(overrides)
    return base


def related(ident: str, kind: str, status: str = "open", title: str | None = None) -> dict[str, Any]:
    return bead(ident, status=status, title=title or f"Title of {ident}", dependency_type=kind)


class FakeBd:
    """list: `beads`; show: `shown[id]` (a bead with its `dependencies`); dep list up: `up[id]`."""

    def __init__(
        self,
        beads: list[dict[str, Any]] | None = None,
        shown: dict[str, dict[str, Any]] | None = None,
        up: dict[str, list[dict[str, Any]]] | None = None,
        failure: Exception | None = None,
        output: Any = None,
    ) -> None:
        self.beads = beads or []
        self.shown = shown or {}
        self.up = up or {}
        self.failure = failure
        self.output = output  # when set, every command returns exactly this
        self.calls: list[tuple[list[str], Path]] = []

    def __call__(self, args: list[str], cwd: Path, *, json_on_failure: bool = False) -> Any:
        self.calls.append((args, cwd))
        if self.failure is not None:
            raise self.failure
        if self.output is not None:
            return self.output
        if args[0] == "list":
            everything = "--all" in args
            return [b for b in self.beads if everything or b["status"] != "closed"]
        ident = args[-1]
        if args[0] == "show":
            return [self.shown[ident]] if ident in self.shown else NO_ISSUE
        if args[:2] == ["dep", "list"]:
            if ident not in self.shown:
                return {"error": f"resolving {ident}: no issue found matching \"{ident}\""}
            return self.up.get(ident, [])
        raise AssertionError(f"unexpected bd arguments: {args}")
```

- [ ] **Step 4: failing tests** `backend/tests/test_beads_source.py`:

```python
import subprocess
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd, bead, related

from gin_console.beads.source import (
    BeadNotFound,
    BeadsError,
    get_bead,
    list_beads,
    run_bd,
    valid_id,
)

CWD = Path("/tmp/project")


# REQ-BEADS-001
def test_beads_001_list_arguments_and_closed_flag() -> None:
    fake = FakeBd([bead("a-1"), bead("a-2", status="closed")])
    assert [b.id for b in list_beads(fake, CWD, closed=False)] == ["a-1"]
    assert fake.calls[0] == (["list", "--limit", "0", "--json"], CWD)
    assert [b.id for b in list_beads(fake, CWD, closed=True)] == ["a-1", "a-2"]
    assert fake.calls[1][0] == ["list", "--limit", "0", "--json", "--all"]


# REQ-BEADS-001
def test_beads_001_optional_fields_default() -> None:
    (summary,) = list_beads(FakeBd([bead("a-1")]), CWD, closed=False)
    assert (summary.labels, summary.assignee, summary.parent) == ([], None, None)
    assert summary.priority == 2 and summary.comment_count == 0


# REQ-BEADS-005
def test_beads_005_a_malformed_bead_is_left_out_of_the_list() -> None:
    fake = FakeBd(
        [bead("a-1"), bead("a-2", title=7), bead("a-3", priority="high"), bead("a-4", priority=True), "x"]
    )
    assert [b.id for b in list_beads(fake, CWD, closed=False)] == ["a-1"]


# REQ-BEADS-005
@pytest.mark.parametrize("output", [{"x": 1}, "text", 5])
def test_beads_005_unexpected_list_output(output: Any) -> None:
    with pytest.raises(BeadsError, match="not understood"):
        list_beads(FakeBd(output=output), CWD, closed=False)


# REQ-BEADS-002
def test_beads_002_detail_relations() -> None:
    shown = bead(
        "a-5",
        description="Why and what",
        parent="a-1",
        dependencies=[related("a-4", "blocks"), related("a-1", "parent-child"), related("z", "relates_to")],
    )
    up = {"a-5": [related("a-6", "blocks"), related("a-7", "parent-child", status="closed")]}
    detail = get_bead(FakeBd(shown={"a-5": shown}, up=up), CWD, "a-5")
    assert detail.description == "Why and what"
    assert [(r.id, r.type) for r in detail.dependencies] == [("a-4", "blocks"), ("a-1", "parent-child")]
    assert [r.id for r in detail.dependents] == ["a-6"]
    assert [(r.id, r.status) for r in detail.children] == [("a-7", "closed")]


# REQ-BEADS-002
def test_beads_002_detail_commands() -> None:
    fake = FakeBd(shown={"a-5": bead("a-5")})
    get_bead(fake, CWD, "a-5")
    assert fake.calls == [
        (["show", "--json", "--", "a-5"], CWD),
        (["dep", "list", "--direction", "up", "--json", "--", "a-5"], CWD),
    ]


# REQ-BEADS-002
def test_beads_002_description_may_be_absent() -> None:
    shown = bead("a-5")
    del shown["description"]
    assert get_bead(FakeBd(shown={"a-5": shown}), CWD, "a-5").description is None


# REQ-BEADS-002
def test_beads_002_unknown_bead() -> None:
    with pytest.raises(BeadNotFound):
        get_bead(FakeBd(), CWD, "nope-1")


# REQ-BEADS-005
@pytest.mark.parametrize(
    "output", [[], {"error": "database is locked"}, [5], "text"]
)
def test_beads_005_detail_unexpected_output(output: Any) -> None:
    with pytest.raises(BeadsError):
        get_bead(FakeBd(output=output), CWD, "a-5")


# REQ-BEADS-003
@pytest.mark.parametrize(
    ("value", "ok"),
    [("a-1", True), ("qwikfone-cr91.5", True), ("A_b.c-9", True), ("--help", False), ("-x", False),
     ("../x", False), ("a/b", False), ("a b", False), ("", False), (".a", False), ("a\x00b", False)],
)
def test_beads_003_id_validation(value: str, ok: bool) -> None:
    assert valid_id(value) is ok


# REQ-BEADS-003
def test_beads_003_an_invalid_id_never_reaches_bd() -> None:
    fake = FakeBd()
    with pytest.raises(BeadNotFound):
        get_bead(fake, CWD, "--help")
    assert fake.calls == []


# REQ-BEADS-006
def test_beads_006_lone_surrogates_are_replaced() -> None:
    shown = bead(
        "a-5", title="a\ud800b", description="d\ud800", labels=["\ud800"],
        dependencies=[related("a-4", "blocks", title="t\ud800")],
    )
    detail = get_bead(FakeBd([shown], {"a-5": shown}), CWD, "a-5")
    for text in (detail.title, detail.description or "", detail.labels[0], detail.dependencies[0].title):
        text.encode("utf-8")
    assert detail.title == "a?b"


def fake_run(monkeypatch: pytest.MonkeyPatch, result: Any) -> list[Any]:
    calls: list[Any] = []

    def run(command: list[str], **kwargs: Any) -> Any:
        calls.append((command, kwargs))
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(subprocess, "run", run)
    return calls


def finished(out: str = "[]", code: int = 0, err: str = "") -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(["bd"], code, out, err)


# REQ-BEADS-005
def test_beads_005_real_runner_uses_a_30_second_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = fake_run(monkeypatch, finished('[{"id": "a-1"}]'))
    assert run_bd(["list", "--json"], CWD) == [{"id": "a-1"}]
    (command, kwargs), = calls
    assert command == ["bd", "list", "--json"]
    assert kwargs["timeout"] == 30 and kwargs["cwd"] == CWD


# REQ-BEADS-005
@pytest.mark.parametrize(
    ("failure", "message"),
    [
        (FileNotFoundError(), "bd not found"),
        (subprocess.TimeoutExpired("bd", 30), "bd timed out"),
        (PermissionError(13, "Permission denied"), "Permission denied"),
    ],
)
def test_beads_005_real_runner_failures(
    monkeypatch: pytest.MonkeyPatch, failure: Exception, message: str
) -> None:
    fake_run(monkeypatch, failure)
    with pytest.raises(BeadsError, match=message):
        run_bd(["list"], CWD)


# REQ-BEADS-005
def test_beads_005_real_runner_non_zero_exit_and_invalid_json(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_run(monkeypatch, finished("", code=2, err="boom"))
    with pytest.raises(BeadsError, match="exited 2: boom"):
        run_bd(["list"], CWD)
    fake_run(monkeypatch, finished("not json"))
    with pytest.raises(BeadsError, match="invalid JSON"):
        run_bd(["list"], CWD)


# REQ-BEADS-002
def test_beads_002_json_on_failure_lets_a_not_found_answer_through(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_run(monkeypatch, finished('{"error": "no issues found"}', code=1))
    assert run_bd(["show"], CWD, json_on_failure=True) == {"error": "no issues found"}
```

Run `uv --directory backend run pytest tests/test_beads_source.py -q`; expect an import error (module missing).

- [ ] **Step 5: implement** `beads/source.py`:

```python
"""Beads of a project, read through the `bd` CLI; the only module that knows its JSON."""

import re
from pathlib import Path
from typing import Any, Protocol

from pydantic import ValidationError

from gin_console.beads.models import BeadDetail, BeadSummary, Relation
from gin_console.projects.collect import CollectError, run_json

BD_TIMEOUT = 30.0
_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*")
_SUMMARY_KEYS = (
    "id", "title", "status", "priority", "issue_type", "labels", "owner", "assignee", "parent",
    "created_at", "updated_at", "dependency_count", "dependent_count", "comment_count",
)


class BeadsError(Exception):
    """`bd` failed or said something unexpected; the message is shown to the operator."""


class BeadNotFound(Exception):
    """No such bead."""


class BdRunner(Protocol):
    def __call__(self, args: list[str], cwd: Path, *, json_on_failure: bool = False) -> Any: ...


def run_bd(args: list[str], cwd: Path, *, json_on_failure: bool = False) -> Any:
    try:
        return run_json(["bd", *args], cwd, json_on_failure=json_on_failure, timeout=BD_TIMEOUT)
    except CollectError as exc:
        raise BeadsError(str(exc)) from None


def valid_id(value: str) -> bool:
    return _ID.fullmatch(value) is not None


def _summary(raw: Any) -> BeadSummary | None:
    if not isinstance(raw, dict):
        return None
    try:
        return BeadSummary.model_validate({k: raw[k] for k in _SUMMARY_KEYS if k in raw})
    except ValidationError:
        return None


def list_beads(run: BdRunner, cwd: Path, closed: bool) -> list[BeadSummary]:
    data = run(["list", "--limit", "0", "--json", *(["--all"] if closed else [])], cwd)
    if not isinstance(data, list):
        raise BeadsError("bd list output was not understood")
    return [bead for bead in map(_summary, data) if bead is not None]


def _fail_on_error(data: Any) -> None:
    """`bd show` and `bd dep list` answer an unknown id with exit 1 and {"error": ...}."""
    if isinstance(data, dict) and "error" in data:
        message = str(data["error"])
        if "no issue" in message:
            raise BeadNotFound(message)
        raise BeadsError(f"bd: {message[:200]}")


def _relations(rows: Any) -> list[Relation]:
    relations: list[Relation] = []
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, dict):
            continue
        try:
            relations.append(Relation.model_validate({**row, "type": row.get("dependency_type")}))
        except ValidationError:  # a malformed row, or a kind this view does not show
            continue
    return relations


def get_bead(run: BdRunner, cwd: Path, bead_id: str) -> BeadDetail:
    if not valid_id(bead_id):
        raise BeadNotFound(bead_id)
    shown = run(["show", "--json", "--", bead_id], cwd, json_on_failure=True)
    _fail_on_error(shown)
    if not isinstance(shown, list) or not shown or not isinstance(shown[0], dict):
        raise BeadsError("bd show output was not understood")
    raw = shown[0]
    up = run(["dep", "list", "--direction", "up", "--json", "--", bead_id], cwd, json_on_failure=True)
    _fail_on_error(up)
    if not isinstance(up, list):
        raise BeadsError("bd dep list output was not understood")
    above = _relations(up)
    try:
        return BeadDetail.model_validate(
            {
                **{k: raw[k] for k in _SUMMARY_KEYS if k in raw},
                "description": raw.get("description") or None,
                "dependencies": _relations(raw.get("dependencies")),
                "dependents": [r for r in above if r.type == "blocks"],
                "children": [r for r in above if r.type == "parent-child"],
            }
        )
    except ValidationError:
        raise BeadsError("bd show output was not understood") from None
```

- [ ] **Step 6:** run `uv --directory backend run pytest -q && uv --directory backend run ruff check . && uv --directory backend run mypy`; expect all green. Fix import order in the new test file if ruff asks.

- [ ] **Step 7: real-host probe** (results go in the track notes, nothing is edited): from `backend/`,

```bash
uv run python - <<'EOF'
import time
from pathlib import Path
from gin_console.beads.source import get_bead, list_beads, run_bd
cwd = Path.home() / "qwikfone"
for closed in (False, True):
    t = time.time(); beads = list_beads(run_bd, cwd, closed); print("closed" if closed else "open", len(beads), round(time.time() - t, 1), "s")
epic = next(b for b in list_beads(run_bd, cwd, False) if b.issue_type == "epic")
d = get_bead(run_bd, cwd, epic.id)
print(d.id, len(d.dependencies), len(d.dependents), len(d.children), [c.status for c in d.children][:6])
EOF
```

Expect about 80 unfinished beads and about 490 with `closed=True`, each well under 30 s, and an epic with children. Report the numbers.

### Track 2: Service and API
- **Dependencies**: Track 1
- **Requirements**: REQ-BEADS-001, REQ-BEADS-002, REQ-BEADS-003, REQ-BEADS-004, REQ-BEADS-005, REQ-BEADS-006
- **Files**: create `backend/src/gin_console/beads/{service,router}.py`, `backend/tests/{test_beads_service,test_beads_api}.py`; modify `backend/src/gin_console/app.py`
- **Provider role**: `backend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of the six REQs has a passing test over HTTP; `closed` and `project` accept any text without a 4xx other than the 404s of the spec; overlapping requests run `bd` once per key; failures are 502 with a JSON `error`, never 500.
- **Estimated complexity**: medium

Interfaces produced: `KeyedCache[K, T]`, `build_router(settings, run, clock)`, `create_app(..., run_bd=run_bd)`, JSON list `[{id,title,status,priority,issue_type,labels,owner,assignee,parent,created_at,updated_at,dependency_count,dependent_count,comment_count}]`, detail adds `description`, `dependencies`, `dependents`, `children` (each `{id,title,status,type}`), errors `{error}` (502) or `{detail}` (404).

- [ ] **Step 1: failing tests.** `backend/tests/test_beads_service.py`:

```python
import threading
import time
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import pytest

from gin_console.beads.service import KeyedCache

START = datetime(2026, 10, 20, 3, 0, tzinfo=UTC)


class Clock:
    def __init__(self) -> None:
        self.now = START

    def __call__(self) -> datetime:
        return self.now


def counting(delay: float = 0.0, fail: bool = False) -> tuple[Callable[[], int], list[int]]:
    runs: list[int] = []

    def fetch() -> int:
        runs.append(1)
        if delay:
            time.sleep(delay)
        if fail:
            raise RuntimeError("boom")
        return len(runs)

    return fetch, runs


# REQ-BEADS-004
def test_beads_004_reused_then_expired() -> None:
    clock = Clock()
    cache = KeyedCache[str, int](timedelta(seconds=5), clock)
    fetch, runs = counting()
    assert cache.get("k", fetch) == 1
    clock.now += timedelta(seconds=2)
    assert cache.get("k", fetch) == 1 and len(runs) == 1
    clock.now += timedelta(seconds=4)  # 6 s after the first fetch
    assert cache.get("k", fetch) == 2 and len(runs) == 2


# REQ-BEADS-004
def test_beads_004_each_key_has_its_own_entry() -> None:
    cache = KeyedCache[str, int](timedelta(seconds=5), Clock())
    fetch, runs = counting()
    cache.get("open", fetch)
    cache.get("closed", fetch)
    assert len(runs) == 2


# REQ-BEADS-004
def test_beads_004_overlapping_requests_for_a_key_run_once() -> None:
    cache = KeyedCache[str, int](timedelta(seconds=5), Clock())
    fetch, runs = counting(delay=0.2)
    threads = [threading.Thread(target=cache.get, args=("k", fetch)) for _ in range(4)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(runs) == 1


# REQ-BEADS-004
def test_beads_004_errors_are_not_kept() -> None:
    cache = KeyedCache[str, int](timedelta(seconds=5), Clock())
    fetch, runs = counting(fail=True)
    for _ in range(2):
        with pytest.raises(RuntimeError):
            cache.get("k", fetch)
    assert len(runs) == 2
```

`backend/tests/test_beads_api.py`:

```python
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd, bead, related
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.source import BeadsError
from gin_console.config import ProjectEntry, Settings


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 10, 20, 3, 0, tzinfo=UTC)

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
        settings, static_dir=tmp_path / "dist", claude_home=tmp_path, run_bd=fake, clock=clock or Clock()
    )
    return TestClient(app, raise_server_exceptions=False)


FOUR = [bead("a-1"), bead("a-2", status="in_progress"), bead("a-3"), bead("a-4", status="open")]
CLOSED = [bead(f"c-{n}", status="closed") for n in range(4)]


# REQ-BEADS-001
def test_beads_001_open_beads_by_default_and_all_on_request(tmp_path: Path) -> None:
    api = make(tmp_path, FakeBd(FOUR + CLOSED))
    body = api.get("/api/beads", params={"project": "proj"}).json()
    assert len(body) == 4 and all(b["status"] != "closed" for b in body)
    assert {"id", "title", "status", "priority", "issue_type", "labels", "updated_at"} <= set(body[0])
    assert "description" not in body[0]
    assert len(api.get("/api/beads", params={"project": "proj", "closed": "1"}).json()) == 8


# REQ-BEADS-001
@pytest.mark.parametrize("params", [{"project": "nope"}, {"project": "gone"}, {}])
def test_beads_001_unknown_project_or_missing_directory_is_404(tmp_path: Path, params: dict[str, str]) -> None:
    fake = FakeBd(FOUR)
    assert make(tmp_path, fake).get("/api/beads", params=params).status_code == 404
    assert fake.calls == []


# REQ-BEADS-002
def test_beads_002_detail_over_http(tmp_path: Path) -> None:
    shown = bead("a-5", description="Why", dependencies=[related("a-4", "blocks")])
    up = {"a-5": [related("a-6", "blocks"), related("a-7", "parent-child", status="closed")]}
    body = make(tmp_path, FakeBd(shown={"a-5": shown}, up=up)).get("/api/beads/proj/a-5").json()
    assert body["description"] == "Why"
    assert [d["id"] for d in body["dependencies"]] == ["a-4"]
    assert [d["id"] for d in body["dependents"]] == ["a-6"]
    assert [(c["id"], c["status"]) for c in body["children"]] == [("a-7", "closed")]
    assert body["children"][0]["type"] == "parent-child"


# REQ-BEADS-002
@pytest.mark.parametrize("path", ["/api/beads/proj/x-1", "/api/beads/nope/a-5", "/api/beads/gone/a-5"])
def test_beads_002_unknown_bead_project_or_directory_is_404(tmp_path: Path, path: str) -> None:
    fake = FakeBd(shown={"a-5": bead("a-5")})
    assert make(tmp_path, fake).get(path).status_code == 404


# REQ-BEADS-003
@pytest.mark.parametrize("ident", ["--help", "-x", "..", "a%2Fb", "a%00b", ".a", "a%20b"])
def test_beads_003_option_like_ids_are_404_and_run_nothing(tmp_path: Path, ident: str) -> None:
    fake = FakeBd(shown={"a-5": bead("a-5")})
    assert make(tmp_path, fake).get(f"/api/beads/proj/{ident}").status_code == 404
    assert fake.calls == []


# REQ-BEADS-003
@pytest.mark.parametrize("closed", ["../x", "true", "", "0", "11", "1&closed=0"])
def test_beads_003_odd_closed_values_mean_not_closed(tmp_path: Path, closed: str) -> None:
    api = make(tmp_path, FakeBd(FOUR + CLOSED))
    response = api.get("/api/beads", params={"project": "proj", "closed": closed})
    assert response.status_code == 200 and len(response.json()) == 4


# REQ-BEADS-003
def test_beads_003_only_read_only_commands_run(tmp_path: Path) -> None:
    fake = FakeBd(FOUR, shown={"a-1": bead("a-1")})
    api = make(tmp_path, fake)
    api.get("/api/beads", params={"project": "proj"})
    api.get("/api/beads/proj/a-1")
    assert {call[0][0] for call in fake.calls} <= {"list", "show", "dep"}
    assert all(call[1] == tmp_path / "proj" for call in fake.calls)


# REQ-BEADS-004
def test_beads_004_cached_for_five_seconds(tmp_path: Path) -> None:
    clock, fake = Clock(), FakeBd(FOUR)
    api = make(tmp_path, fake, clock)
    api.get("/api/beads", params={"project": "proj"})
    clock.now += timedelta(seconds=2)
    api.get("/api/beads", params={"project": "proj"})
    assert len(fake.calls) == 1
    clock.now += timedelta(seconds=4)
    api.get("/api/beads", params={"project": "proj"})
    assert len(fake.calls) == 2
    api.get("/api/beads", params={"project": "proj", "closed": "1"})
    assert len(fake.calls) == 3  # a different key


# REQ-BEADS-004
def test_beads_004_errors_are_not_kept(tmp_path: Path) -> None:
    fake = FakeBd(FOUR, failure=BeadsError("bd not found"))
    api = make(tmp_path, fake)
    assert api.get("/api/beads", params={"project": "proj"}).status_code == 502
    fake.failure = None
    assert api.get("/api/beads", params={"project": "proj"}).status_code == 200


# REQ-BEADS-005
@pytest.mark.parametrize("message", ["bd not found", "bd timed out", "bd exited 1: boom", "bd printed invalid JSON"])
def test_beads_005_failures_are_502_with_an_error(tmp_path: Path, message: str) -> None:
    api = make(tmp_path, FakeBd(failure=BeadsError(message)))
    for path in ("/api/beads?project=proj", "/api/beads/proj/a-5"):
        response = api.get(path)
        assert response.status_code == 502 and response.json() == {"error": message}


# REQ-BEADS-005
def test_beads_005_one_malformed_bead_does_not_fail_the_list(tmp_path: Path) -> None:
    fake = FakeBd([bead("a-1"), bead("a-2", title=7), bead("a-3")])
    body = make(tmp_path, fake).get("/api/beads", params={"project": "proj"}).json()
    assert [b["id"] for b in body] == ["a-1", "a-3"]


# REQ-BEADS-005
def test_beads_005_a_too_deeply_nested_bd_answer_is_a_502_not_a_500(tmp_path: Path) -> None:
    api = make(tmp_path, FakeBd(failure=RecursionError()))
    response = api.get("/api/beads", params={"project": "proj"})
    assert response.status_code == 502 and "error" in response.json()


# REQ-BEADS-006
def test_beads_006_lone_surrogates_do_not_break_responses(tmp_path: Path) -> None:
    shown = bead("a-5", title="a\ud800b", description="x\ud800")
    api = make(tmp_path, FakeBd([shown], {"a-5": shown}))
    assert api.get("/api/beads", params={"project": "proj"}).status_code == 200
    detail = api.get("/api/beads/proj/a-5")
    assert detail.status_code == 200 and detail.json()["title"] == "a?b"
```

Run `uv --directory backend run pytest -q`; expect failures.

- [ ] **Step 2: cache** `beads/service.py`:

```python
import threading
from collections.abc import Callable, Hashable
from datetime import datetime, timedelta

MAX_ENTRIES = 256


class KeyedCache[K: Hashable, T]:
    """Reuse a successful result per key; one fetch per key at a time; errors are not kept."""

    def __init__(self, ttl: timedelta, clock: Callable[[], datetime]) -> None:
        self._ttl = ttl
        self._clock = clock
        self._guard = threading.Lock()
        # simplified: one lock per key ever asked for; bounded by the beads viewed, cleared on restart
        self._locks: dict[K, threading.Lock] = {}
        self._items: dict[K, tuple[datetime, T]] = {}

    def get(self, key: K, fetch: Callable[[], T]) -> T:
        with self._guard:
            lock = self._locks.setdefault(key, threading.Lock())
        with lock:
            now = self._clock()
            hit = self._items.get(key)
            if hit is not None and now - hit[0] < self._ttl:
                return hit[1]
            value = fetch()  # an exception propagates and nothing is stored
            with self._guard:
                if len(self._items) >= MAX_ENTRIES:
                    self._items = {k: v for k, v in self._items.items() if now - v[0] < self._ttl}
                self._items[key] = (now, value)
            return value
```

- [ ] **Step 3: router and app.** `beads/router.py`:

```python
from collections.abc import Callable
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from gin_console.beads.models import BeadDetail, BeadSummary
from gin_console.beads.service import KeyedCache
from gin_console.beads.source import BdRunner, BeadNotFound, BeadsError, get_bead, list_beads, valid_id
from gin_console.config import Settings

TTL = timedelta(seconds=5)


def build_router(settings: Settings, run: BdRunner, clock: Callable[[], datetime]) -> APIRouter:
    router = APIRouter()
    lists = KeyedCache[tuple[str, bool], list[BeadSummary]](TTL, clock)
    details = KeyedCache[tuple[str, str], BeadDetail](TTL, clock)

    def project_dir(name: str | None) -> Path:
        entry = next((p for p in settings.projects if p.name == name), None)
        if entry is None or not entry.path.is_dir():
            raise HTTPException(status_code=404)
        return entry.path

    def failure(exc: BeadsError | RecursionError) -> JSONResponse:
        return JSONResponse(status_code=502, content={"error": str(exc) or "bd output was too deeply nested"})

    @router.get("/beads", response_model=list[BeadSummary])
    def get_beads(project: str | None = None, closed: str | None = None) -> list[BeadSummary] | JSONResponse:
        cwd = project_dir(project)
        wants_closed = closed == "1"  # any other value means "no": it is never passed on
        try:
            return lists.get((str(project), wants_closed), lambda: list_beads(run, cwd, wants_closed))
        except (BeadsError, RecursionError) as exc:
            return failure(exc)

    @router.get("/beads/{project}/{bead_id}", response_model=BeadDetail)
    def get_one(project: str, bead_id: str) -> BeadDetail | JSONResponse:
        cwd = project_dir(project)
        if not valid_id(bead_id):
            raise HTTPException(status_code=404)
        try:
            return details.get((project, bead_id), lambda: get_bead(run, cwd, bead_id))
        except BeadNotFound:
            raise HTTPException(status_code=404) from None
        except (BeadsError, RecursionError) as exc:
            return failure(exc)

    return router
```

In `app.py` import `from gin_console.beads.router import build_router as build_beads_router`, `from gin_console.beads.source import BdRunner` and `from gin_console.beads.source import run_bd as default_run_bd`, add the parameter `run_bd: BdRunner = default_run_bd`, and `api.include_router(build_beads_router(settings, run_bd, clock))` before the `/{rest:path}` catch-all. `clock` is the existing parameter from the quota change.

- [ ] **Step 4:** run `uv --directory backend run pytest -q && uv --directory backend run ruff check . && uv --directory backend run mypy`; expect all green. Then a real-host probe through HTTP: `TestClient(create_app(load_settings(default_config_path())))`, `GET /api/beads?project=qwikfone` (twice: the second instant), `&closed=1`, one detail of an epic; report counts and timings.

### Track 3: Frontend data layer
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-024 (sorting and counting rules), REQ-UI-025, REQ-UI-026 (the filter logic and URL state), part of REQ-UI-029 (unexpected shapes)
- **Files**: modify `frontend/src/app/route.ts`; create `frontend/src/features/beads/{api.ts,filters.ts,api.test.ts,filters.test.ts}`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: the guards reject every malformed shape listed in the tests; filtering, sorting and URL round-trips are covered scenario by scenario; `navigate(to, { replace: true })` does not add a history entry; no new dependency.
- **Estimated complexity**: medium

Interfaces produced: types `BeadSummary`, `Relation`, `BeadDetail`; `BeadNotFoundError`; `fetchBeads(project, closed)`, `fetchBead(project, id)`; `BeadFilters`, `BeadOptions`, `parseFilters(search)`, `filtersToSearch(filters)`, `filterBeads(beads, filters)`, `sortBeads(beads)`, `optionsOf(beads)`, `navigate(to, options?)`.

- [ ] **Step 1: failing tests.** `frontend/src/features/beads/filters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { BeadSummary } from "./api";
import { filterBeads, filtersToSearch, optionsOf, parseFilters, sortBeads } from "./filters";

const bead = (id: string, overrides: Partial<BeadSummary> = {}): BeadSummary => ({
  id,
  title: `Title ${id}`,
  status: "open",
  priority: 2,
  issue_type: "task",
  labels: [],
  owner: null,
  assignee: null,
  parent: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-10T00:00:00Z",
  dependency_count: 0,
  dependent_count: 0,
  comment_count: 0,
  ...overrides,
});

const empty = parseFilters("");

describe("filters", () => {
  // REQ-UI-025
  it("REQ-UI-025 restores every filter from the URL", () => {
    const f = parseFilters("?project=a&q=fix&status=open&priority=1&label=qa&type=bug&closed=1");
    expect(f).toEqual({ project: "a", q: "fix", status: "open", priority: "1", label: "qa", type: "bug", closed: true });
  });

  // REQ-UI-025
  it("REQ-UI-025 writes only the filters that are set", () => {
    expect(filtersToSearch(empty)).toBe("");
    expect(filtersToSearch({ ...empty, project: "a b", q: "x&y", closed: true })).toBe(
      "?project=a+b&q=x%26y&closed=1",
    );
    const round = { ...empty, project: "a", status: "open", priority: "1" };
    expect(parseFilters(filtersToSearch(round))).toEqual(round);
  });

  // REQ-UI-025
  it("REQ-UI-025 treats anything but closed=1 as not closed", () => {
    expect(parseFilters("?closed=true").closed).toBe(false);
    expect(parseFilters("?closed=1").closed).toBe(true);
  });

  // REQ-UI-025
  it("REQ-UI-025 search matches id, title and labels without regard to case", () => {
    const beads = [
      bead("a-1", { title: "Fix login" }),
      bead("a-2", { title: "Add search" }),
      bead("b-7", { labels: ["Login-Flow"] }),
    ];
    const ids = (q: string) => filterBeads(beads, { ...empty, q }).map((b) => b.id);
    expect(ids("LOGIN")).toEqual(["a-1", "b-7"]);
    expect(ids("a-2")).toEqual(["a-2"]);
    expect(ids("  login  ")).toEqual(["a-1", "b-7"]);
    expect(ids("")).toEqual(["a-1", "a-2", "b-7"]);
  });

  // REQ-UI-025
  it("REQ-UI-025 combines status, priority, label and type with AND", () => {
    const beads = [
      bead("1", { status: "open", priority: 1, labels: ["qa"], issue_type: "bug" }),
      bead("2", { status: "in_progress", priority: 1, labels: ["qa"], issue_type: "bug" }),
      bead("3", { status: "open", priority: 2, labels: ["qa"], issue_type: "bug" }),
      bead("4", { status: "open", priority: 1, labels: [], issue_type: "bug" }),
      bead("5", { status: "open", priority: 1, labels: ["qa"], issue_type: "task" }),
    ];
    const f = { ...empty, status: "open", priority: "1", label: "qa", type: "bug" };
    expect(filterBeads(beads, f).map((b) => b.id)).toEqual(["1"]);
    expect(filterBeads(beads, { ...empty, status: "open" }).map((b) => b.id)).toEqual(["1", "3", "4", "5"]);
  });

  // REQ-UI-026
  it("REQ-UI-026 hides closed beads unless showing closed ones is on", () => {
    const beads = [bead("1"), bead("2", { status: "closed" })];
    expect(filterBeads(beads, empty).map((b) => b.id)).toEqual(["1"]);
    expect(filterBeads(beads, { ...empty, closed: true }).map((b) => b.id)).toEqual(["1", "2"]);
    expect(filterBeads(beads, { ...empty, closed: true, status: "closed" }).map((b) => b.id)).toEqual(["2"]);
  });

  // REQ-UI-024
  it("REQ-UI-024 orders by priority and then by last update, newest first", () => {
    const beads = [
      bead("old-p2", { priority: 2, updated_at: "2026-10-01T00:00:00Z" }),
      bead("new-p2", { priority: 2, updated_at: "2026-10-09T00:00:00Z" }),
      bead("p1", { priority: 1, updated_at: "2026-09-01T00:00:00Z" }),
    ];
    expect(sortBeads(beads).map((b) => b.id)).toEqual(["p1", "new-p2", "old-p2"]);
    expect(beads.map((b) => b.id)).toEqual(["old-p2", "new-p2", "p1"]); // the input is not mutated
  });

  // REQ-UI-025
  it("REQ-UI-025 offers the values that exist as filter options", () => {
    const options = optionsOf([
      bead("1", { status: "open", labels: ["b", "a"], priority: 3, issue_type: "bug" }),
      bead("2", { status: "in_progress", labels: ["a"], priority: 1, issue_type: "task" }),
    ]);
    expect(options).toEqual({
      statuses: ["in_progress", "open"],
      priorities: [1, 3],
      labels: ["a", "b"],
      types: ["bug", "task"],
    });
  });
});
```

`frontend/src/features/beads/api.test.ts` (REQ-UI-029): stub `fetch` (fresh `Response` per call, `cleanup`-free since no rendering): (a) `fetchBeads("proj", false)` requests `/api/beads?project=proj` and `fetchBeads("a b", true)` requests `/api/beads?project=a%20b&closed=1`; (b) a valid list resolves; (c) each of these rejects with `/unexpected response/`: a body that is not an array, an item whose `priority` is a string, an item whose `labels` is not an array of strings, an item missing `title`; (d) a 502 body `{"error": "bd not found"}` rejects with exactly that message; (e) a 404 rejects with `/not found/i`; (f) `fetchBead("p", "a-1")` requests `/api/beads/p/a-1`, encodes odd ids (`a/b` -> `a%2Fb`), rejects with `BeadNotFoundError` on 404 and with `/unexpected response/` when `dependencies` is not an array or an entry has an unknown `type`.

`route.test.ts` addition is covered by `App.test.tsx` in Track 4; here add one test file `frontend/src/app/route.test.ts`: `navigate("/x")` pushes (history length grows), `navigate("/y", { replace: true })` does not (length unchanged and `location.pathname === "/y"`), both fire a `popstate` event.

Run `pnpm -C frontend test --run`; expect failures (modules missing).

- [ ] **Step 2: route option** `app/route.ts`:

```ts
export function navigate(to: string, options?: { replace?: boolean }): void {
  if (options?.replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
```

- [ ] **Step 3: API module** `beads/api.ts`:

```ts
import { field, isFiniteNumber, isString, isStringOrNull } from "@/lib/guards";

export type BeadSummary = {
  id: string;
  title: string;
  status: string;
  priority: number;
  issue_type: string;
  labels: string[];
  owner: string | null;
  assignee: string | null;
  parent: string | null;
  created_at: string;
  updated_at: string;
  dependency_count: number;
  dependent_count: number;
  comment_count: number;
};
export type Relation = { id: string; title: string; status: string; type: "blocks" | "parent-child" };
export type BeadDetail = BeadSummary & {
  description: string | null;
  dependencies: Relation[];
  dependents: Relation[];
  children: Relation[];
};

export class BeadNotFoundError extends Error {}

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const isStringArray = (value: unknown) => Array.isArray(value) && value.every(isString);

function isSummary(value: unknown): value is BeadSummary {
  return (
    isObject(value) &&
    ["id", "title", "status", "issue_type", "created_at", "updated_at"].every((k) => isString(field(value, k))) &&
    ["owner", "assignee", "parent"].every((k) => isStringOrNull(field(value, k))) &&
    ["priority", "dependency_count", "dependent_count", "comment_count"].every((k) =>
      isFiniteNumber(field(value, k)),
    ) &&
    isStringArray(field(value, "labels"))
  );
}

function isRelation(value: unknown): value is Relation {
  return (
    isObject(value) &&
    ["id", "title", "status"].every((k) => isString(field(value, k))) &&
    ["blocks", "parent-child"].includes(String(field(value, "type")))
  );
}

const isRelations = (value: unknown) => Array.isArray(value) && value.every(isRelation);

function isDetail(value: unknown): value is BeadDetail {
  return (
    isSummary(value) &&
    isStringOrNull(field(value, "description")) &&
    ["dependencies", "dependents", "children"].every((k) => isRelations(field(value, k)))
  );
}

async function failure(response: Response, what: string): Promise<Error> {
  if (response.status === 404) return new BeadNotFoundError(`${what} not found`);
  let detail = `HTTP ${response.status}`;
  try {
    const body: unknown = await response.json();
    const message = isObject(body) ? field(body, "error") : undefined;
    if (typeof message === "string") detail = message;
  } catch {
    // keep the HTTP status
  }
  return new Error(detail);
}

export async function fetchBeads(project: string, closed: boolean): Promise<BeadSummary[]> {
  const response = await fetch(`/api/beads?project=${encodeURIComponent(project)}${closed ? "&closed=1" : ""}`);
  if (!response.ok) throw await failure(response, "Project");
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isSummary)) {
    throw new Error("Could not load beads (unexpected response)");
  }
  return body;
}

export async function fetchBead(project: string, id: string): Promise<BeadDetail> {
  const response = await fetch(`/api/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}`);
  if (!response.ok) throw await failure(response, "Bead");
  const body: unknown = await response.json();
  if (!isDetail(body)) throw new Error("Could not load the bead (unexpected response)");
  return body;
}
```

- [ ] **Step 4: filters** `beads/filters.ts`:

```ts
import type { BeadSummary } from "./api";

export type BeadFilters = {
  project: string;
  q: string;
  status: string;
  priority: string;
  label: string;
  type: string;
  closed: boolean;
};

export function parseFilters(search: string): BeadFilters {
  const p = new URLSearchParams(search);
  return {
    project: p.get("project") ?? "",
    q: p.get("q") ?? "",
    status: p.get("status") ?? "",
    priority: p.get("priority") ?? "",
    label: p.get("label") ?? "",
    type: p.get("type") ?? "",
    closed: p.get("closed") === "1",
  };
}

export function filtersToSearch(filters: BeadFilters): string {
  const p = new URLSearchParams();
  for (const key of ["project", "q", "status", "priority", "label", "type"] as const) {
    if (filters[key] !== "") p.set(key, filters[key]);
  }
  if (filters.closed) p.set("closed", "1");
  const text = p.toString();
  return text === "" ? "" : `?${text}`;
}

export function filterBeads(beads: readonly BeadSummary[], filters: BeadFilters): BeadSummary[] {
  const needle = filters.q.trim().toLowerCase();
  return beads.filter(
    (bead) =>
      (needle === "" ||
        bead.id.toLowerCase().includes(needle) ||
        bead.title.toLowerCase().includes(needle) ||
        bead.labels.some((label) => label.toLowerCase().includes(needle))) &&
      (filters.status === "" || bead.status === filters.status) &&
      (filters.priority === "" || String(bead.priority) === filters.priority) &&
      (filters.label === "" || bead.labels.includes(filters.label)) &&
      (filters.type === "" || bead.issue_type === filters.type) &&
      (filters.closed || bead.status !== "closed"), // a closed list may still be on screen while the next one loads
  );
}

export function sortBeads(beads: readonly BeadSummary[]): BeadSummary[] {
  return [...beads].sort(
    (a, b) => a.priority - b.priority || Date.parse(b.updated_at) - Date.parse(a.updated_at),
  );
}

export type BeadOptions = ReturnType<typeof optionsOf>;

export function optionsOf(beads: readonly BeadSummary[]) {
  const unique = <T,>(values: T[], compare: (a: T, b: T) => number) => [...new Set(values)].sort(compare);
  const text = (a: string, b: string) => a.localeCompare(b);
  return {
    statuses: unique(beads.map((b) => b.status), text),
    priorities: unique(beads.map((b) => b.priority), (a, b) => a - b),
    labels: unique(beads.flatMap((b) => b.labels), text),
    types: unique(beads.map((b) => b.issue_type), text),
  };
}
```

`as const` on the key tuple is a const assertion, not a type assertion, and is allowed by the rule pack. An unparseable `updated_at` makes the subtraction `NaN`; `sort` then treats it as equal, which is acceptable.

- [ ] **Step 5:** run `pnpm -C frontend test --run && pnpm -C frontend lint && pnpm -C frontend typecheck && pnpm -C frontend build`; expect all green.

### Track 4: Bead list page
- **Dependencies**: Track 3
- **Requirements**: REQ-UI-022, REQ-UI-023, REQ-UI-024, REQ-UI-025, REQ-UI-026, REQ-UI-027, list part of REQ-UI-029
- **Files**: create `frontend/src/features/beads/{BeadsPage,BeadList,BeadFilterBar,BeadTable}.tsx`, `frontend/src/features/beads/BeadsPage.test.tsx`; modify `frontend/src/app/{Layout.tsx,App.tsx,App.test.tsx}`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of the listed REQs has a vitest test; filters live in the URL and survive a reload; showing closed beads requests `closed=1`; refresh keeps the list on screen; rules of the previous frontend reviews hold (cleanup in tests, fresh `Response` per call, no setState in effects, no clock read during render, no `as`/`any`/`!`).
- **Estimated complexity**: medium

Interfaces consumed: Track 3. Produced: `BeadsPage`, `BeadList`, `BeadFilterBar`, `BeadTable`, route `/beads`.

- [ ] **Step 1: failing tests** `BeadsPage.test.tsx`. Helpers: `json`, `bead(...)` as in `filters.test.ts` (copy them into the file), a `stub` that routes `fetch` by URL (`/api/projects` -> two projects `alpha` (exists) and `omega` (exists) plus one with `exists: false`; `/api/beads?...` -> a function of the URL), `beforeEach(() => window.history.replaceState(null, "", "/beads"))`, `afterEach` with `cleanup()`, `vi.useRealTimers()`, `vi.restoreAllMocks()`, `vi.unstubAllGlobals()`. Tests (each title carries the REQ-ID):

  - REQ-UI-023 default and choice: no `?project=` -> `alpha` selected (`getByLabelText("Project")` has value `alpha`) and its beads shown; choosing `omega` with `userEvent.selectOptions` changes `location.search` to `?project=omega` and shows omega's beads; the project without a directory is not offered.
  - REQ-UI-023 no projects: `/api/projects` returns `[]` -> text `/no projects configured/i`.
  - REQ-UI-024 row content and order: a P2 bead updated yesterday and a P1 bead updated last week -> the P1 row is first; each row shows id, a link named by the title with `href="/beads/alpha/<id>"`, type, status, `P1`, labels, assignee (or owner when no assignee) and an update time.
  - REQ-UI-024 count and empty: 83 beads of which 5 match -> `5 of 83`; none match -> `/no beads match/i`.
  - REQ-UI-025 search and combined filters: typing `LOGIN` keeps only matching rows and `location.search` contains `q=LOGIN` while `history.length` does not grow (replace); selecting status `open` and priority `P1` keeps only open P1 beads and the URL holds both; "Clear filters" empties them.
  - REQ-UI-025 restored from the URL: `replaceState(null, "", "/beads?project=alpha&status=open&q=fix")` before render -> rows are filtered and the controls show those values.
  - REQ-UI-026 show closed: initially the list is requested without `closed`; turning on `Show closed` requests `.../api/beads?project=alpha&closed=1`, shows the closed beads, and the URL has `closed=1`; search and filters apply to them.
  - REQ-UI-027 silent refresh: `vi.useFakeTimers()`, first answer lists `Fix login`, later answers list `Renamed`; after `await act(async () => { await vi.advanceTimersByTimeAsync(10_000); })` the table shows `Renamed` and `queryByText(/loading/i)` is null; with the visibility spy set to `hidden`, no request after 30 s and one request after `visibilitychange` back to visible; a failed refresh (500 `{"error": "bd exited 1: boom"}`) keeps the rows and shows an alert containing `bd exited 1: boom` with a Retry button.
  - REQ-UI-029 list error and retry: the first list request is 502 `{"error": "bd not found"}`, the second succeeds -> alert `bd not found`, click Retry, rows appear, no alert; a malformed body (`{"x": 1}`) shows an alert `/unexpected response/` and Retry.
  - REQ-UI-022 plain text: a title `<script>window.hacked = 1</script>` renders as text and `container.querySelector("script")` is null.

  `App.test.tsx` additions (REQ-UI-022): from `/`, clicking the `Beads` link goes to `/beads` without a reload and shows the list (fetch stubbed for `/api/projects` and `/api/beads`); `history.back()` returns to the Projects page; a direct visit to `/beads/%E0%A4%A/x` (undecodable segment) shows the Projects page; the sidebar `Beads` link is highlighted on `/beads`.

  Run `pnpm -C frontend test --run`; expect failures.

- [ ] **Step 2: components.** `BeadTable.tsx`:

```tsx
import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BeadSummary } from "./api";

export function BeadTable({ project, beads }: { project: string; beads: readonly BeadSummary[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["Id", "Title", "Type", "Status", "Priority", "Labels", "Assignee", "Updated"].map((name) => (
            <TableHead key={name}>{name}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {beads.map((bead) => (
          <TableRow key={bead.id}>
            <TableCell className="font-mono text-xs">{bead.id}</TableCell>
            <TableCell className="font-medium">
              <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(bead.id)}`}>{bead.title}</Link>
            </TableCell>
            <TableCell>{bead.issue_type}</TableCell>
            <TableCell>
              <Badge variant="secondary">{bead.status}</Badge>
            </TableCell>
            <TableCell>{`P${bead.priority}`}</TableCell>
            <TableCell className="space-x-1">
              {bead.labels.map((label) => (
                <Badge key={label} variant="outline">
                  {label}
                </Badge>
              ))}
            </TableCell>
            <TableCell>{bead.assignee ?? bead.owner ?? ""}</TableCell>
            <TableCell>{new Date(bead.updated_at).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

`FilterSelect.tsx`:

```tsx
export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  // keep a value that came from the URL selectable even when no loaded bead has it
  const shown =
    value !== "" && !options.some((o) => o.value === value) ? [...options, { value, label: value }] : options;
  return (
    <label className="flex items-center gap-1 text-sm">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border bg-background px-2 py-1"
      >
        <option value="">All</option>
        {shown.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
```

`BeadFilterBar.tsx` (holds no state; every control reports a new filter object):

```tsx
import { Button } from "@/components/ui/button";
import { FilterSelect } from "./FilterSelect";
import type { BeadFilters, BeadOptions } from "./filters";

const same = (value: string) => ({ value, label: value });

export function BeadFilterBar({
  filters,
  options,
  onChange,
}: {
  filters: BeadFilters;
  options: BeadOptions;
  onChange: (next: BeadFilters) => void;
}) {
  const set = (patch: Partial<BeadFilters>) => onChange({ ...filters, ...patch });
  return (
    <div className="flex flex-wrap items-end gap-3">
      <input
        aria-label="Search"
        type="search"
        placeholder="Search id, title, label"
        value={filters.q}
        onChange={(event) => set({ q: event.target.value })}
        className="rounded border bg-background px-2 py-1 text-sm"
      />
      <FilterSelect label="Status" value={filters.status} options={options.statuses.map(same)} onChange={(status) => set({ status })} />
      <FilterSelect
        label="Priority"
        value={filters.priority}
        options={options.priorities.map((p) => ({ value: String(p), label: `P${p}` }))}
        onChange={(priority) => set({ priority })}
      />
      <FilterSelect label="Label" value={filters.label} options={options.labels.map(same)} onChange={(label) => set({ label })} />
      <FilterSelect label="Type" value={filters.type} options={options.types.map(same)} onChange={(type) => set({ type })} />
      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" checked={filters.closed} onChange={(event) => set({ closed: event.target.checked })} />
        Show closed
      </label>
      <Button variant="outline" size="sm" onClick={() => set({ q: "", status: "", priority: "", label: "", type: "" })}>
        Clear filters
      </Button>
    </div>
  );
}
```

`BeadList.tsx`. The page keys it by project only: toggling "Show closed" changes the `load` callback, so the shared hook reloads at once while the controls stay on screen, and the closed rule in `filterBeads` hides a closed list that is still showing:

```tsx
import { useCallback, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useVisibleInterval } from "@/lib/useVisibleInterval";
import { fetchBeads, type BeadSummary } from "./api";
import { BeadFilterBar } from "./BeadFilterBar";
import { BeadTable } from "./BeadTable";
import { filterBeads, optionsOf, sortBeads, type BeadFilters } from "./filters";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; beads: BeadSummary[]; error: string | null };

const REFRESH_MS = 10_000;
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function BeadList({
  project,
  filters,
  onChange,
}: {
  project: string;
  filters: BeadFilters;
  onChange: (next: BeadFilters) => void;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const closed = filters.closed;

  const load = useCallback(() => {
    void fetchBeads(project, closed).then(
      (beads) => setState({ status: "ok", beads, error: null }),
      (error: unknown) =>
        setState((previous) =>
          previous.status === "ok"
            ? { ...previous, error: messageOf(error) }
            : { status: "error", message: messageOf(error) },
        ),
    );
  }, [project, closed]);

  useVisibleInterval(load, REFRESH_MS);

  const retry = () => {
    if (state.status === "error") setState({ status: "loading" });
    load();
  };

  const errorMessage = state.status === "error" ? state.message : state.status === "ok" ? state.error : null;
  const beads = state.status === "ok" ? state.beads : [];
  const shown = sortBeads(filterBeads(beads, filters));

  return (
    <section className="flex flex-col gap-4">
      {state.status === "loading" && <p className="text-muted-foreground">Loading beads…</p>}
      {errorMessage !== null && (
        <Alert variant="destructive">
          <AlertTitle>Beads could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {state.status === "ok" && (
        <>
          <BeadFilterBar filters={filters} options={optionsOf(beads)} onChange={onChange} />
          <p className="text-sm text-muted-foreground">{`${shown.length} of ${beads.length}`}</p>
          {shown.length === 0 ? (
            <p className="text-muted-foreground">No beads match.</p>
          ) : (
            <BeadTable project={project} beads={shown} />
          )}
        </>
      )}
    </section>
  );
}
```

`BeadsPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { navigate, useLocation } from "@/app/route";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchProjects, type Project } from "@/features/projects/api";
import { BeadList } from "./BeadList";
import { filtersToSearch, parseFilters, type BeadFilters } from "./filters";

type Projects =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; names: string[] };

export function BeadsPage() {
  const [projects, setProjects] = useState<Projects>({ status: "loading" });
  const { search } = useLocation();
  const filters = parseFilters(search);

  useEffect(() => {
    void fetchProjects().then(
      (list: Project[]) =>
        setProjects({ status: "ok", names: list.filter((p) => p.exists).map((p) => p.name) }),
      (error: unknown) =>
        setProjects({ status: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  }, []);

  const change = (next: BeadFilters) => navigate(`/beads${filtersToSearch(next)}`, { replace: true });
  const names = projects.status === "ok" ? projects.names : [];
  // the default is not written back into the URL
  const selected = names.includes(filters.project) ? filters.project : (names[0] ?? "");

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Beads</h1>
      {projects.status === "loading" && <p className="text-muted-foreground">Loading projects…</p>}
      {projects.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Projects could not be loaded</AlertTitle>
          <AlertDescription>{projects.message}</AlertDescription>
        </Alert>
      )}
      {projects.status === "ok" && names.length === 0 && (
        <p className="text-muted-foreground">No projects configured.</p>
      )}
      {selected !== "" && (
        <>
          <label className="flex items-center gap-2 text-sm">
            Project
            <select
              value={selected}
              onChange={(event) => change({ ...filters, project: event.target.value })}
              className="rounded border bg-background px-2 py-1"
            >
              {names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <BeadList key={selected} project={selected} filters={filters} onChange={change} />
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 3: nav and routes.** `Layout.tsx`: a `Beads` link between Projects and Sessions, active when `pathname.startsWith("/beads")`. `App.tsx`: render `<BeadsPage />` when `pathname === "/beads"`; the bead route and page come in Track 5 (until then `/beads/<p>/<id>` falls through to the Projects page).

- [ ] **Step 4:** run `pnpm -C frontend test --run && pnpm -C frontend lint && pnpm -C frontend typecheck && pnpm -C frontend build && uv --directory backend run pytest -q`; expect all green.

### Track 5: Bead page and dashboard links
- **Dependencies**: Track 4
- **Requirements**: REQ-UI-028, REQ-UI-029 (bead part), modified REQ-UI-005
- **Files**: create `frontend/src/features/beads/{BeadDetailPage.tsx,BeadDetailPage.test.tsx}`; modify `frontend/src/app/App.tsx`, `frontend/src/app/App.test.tsx`, `frontend/src/features/projects/ProjectCard.tsx`, `frontend/src/features/projects/ProjectsPage.test.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of REQ-UI-028 and the bead part of REQ-UI-029 has a vitest test; the epics on a project card link to `/beads/<project>/<id>` with or without a `scotty_url`; the project-name link to Scotty is unchanged; description text is never interpreted.
- **Estimated complexity**: medium

- [ ] **Step 1: failing tests.** `BeadDetailPage.test.tsx` (same setup as the list tests; render `<BeadDetailPage project="alpha" id="a-5" />`; the detail JSON is a `BeadSummary` plus `description`, `dependencies`, `dependents`, `children`):

  - REQ-UI-028 fields and plain text: id, title, status, priority `P1`, type, labels, owner, assignee, created and updated times and `3 comments` are shown; a description `<script>window.hacked = 1</script> **bold**\nsecond line` is found by `getByText` as typed (use a function matcher on the element's `textContent`), `container.querySelector("script")` and `container.querySelector("strong")` are null, and the element has `whitespace-pre-wrap`.
  - REQ-UI-028 relations link inside the console: one dependency `a-4` (status `open`) shows id, title and status and its link has `href="/beads/alpha/a-4"`; the same for an item under "Blocks" (dependents); a project name with a space is encoded (`/beads/my%20proj/a-4`).
  - REQ-UI-028 epic progress: 4 children of which 3 closed -> the children are listed with links and a `progressbar` named `Children closed` has `aria-valuenow="75"` next to the text `3 of 4 closed`; a bead without children shows no progress bar and no Children heading.
  - REQ-UI-029 not found: 404 -> `Bead not found` and a link `Back to beads` with `href="/beads?project=alpha"`.
  - REQ-UI-029 error and retry: first request 502 `{"error": "bd timed out"}` then success -> alert `bd timed out`, click Retry, the bead shows, no alert; an unexpected body (`{"x": 1}`) -> alert `/unexpected response/` and Retry.
  - REQ-UI-028 no description: a bead without a description shows `No description.`

  `ProjectsPage.test.tsx` (REQ-UI-005, modified): replace the two existing REQ-UI-005 tests with:

```tsx
  // REQ-UI-005
  it("REQ-UI-005 links the project name to Scotty in a new tab and each epic to the console", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json([project({ name: "scotty", scotty_id: "scotty", scotty_url: "https://h/p/scotty", beads })]),
      ),
    );
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "scotty" });
    const projectLink = within(card).getByRole("link", { name: "scotty" });
    expect(projectLink).toHaveAttribute("href", "https://h/p/scotty");
    expect(projectLink).toHaveAttribute("target", "_blank");
    expect(projectLink).toHaveAttribute("rel", "noopener noreferrer");
    const epicLink = within(card).getByRole("link", { name: "e1" });
    expect(epicLink).toHaveAttribute("href", "/beads/scotty/e1");
    expect(epicLink).not.toHaveAttribute("target");
  });

  // REQ-UI-005
  it("REQ-UI-005 links epics to the console and leaves the name plain without a Scotty URL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ beads })])));
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "qwikfone" });
    expect(within(card).getByRole("link", { name: "e1" })).toHaveAttribute("href", "/beads/qwikfone/e1");
    expect(within(card).queryByRole("link", { name: "qwikfone" })).not.toBeInTheDocument();
  });
```

  and one more: a project name with a space and an epic id with a slash are encoded in the epic link. Add to `App.test.tsx` (REQ-UI-022): `/beads/alpha/a-5` renders the bead page (fetch stubbed) and `/beads/%E0%A4%A/a-5` falls back to the Projects page.

  Run `pnpm -C frontend test --run`; expect failures.

- [ ] **Step 2: bead page.** `RelationList.tsx`:

```tsx
import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import type { Relation } from "./api";

export function RelationList({ title, project, items }: { title: string; project: string; items: Relation[] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-1">
      <h2 className="font-medium">{title}</h2>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2">
            <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(item.id)}`}>
              <span className="font-mono">{item.id}</span>
            </Link>
            <span>{item.title}</span>
            <Badge variant="secondary">{item.status}</Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

`BeadDetailPage.tsx` (mounted with `key={`${project}/${id}`}` by `App`, so it needs no reset effect):

```tsx
import { useEffect, useState } from "react";
import { Link } from "@/app/Link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/features/quota/ProgressBar";
import { BeadNotFoundError, fetchBead, type BeadDetail } from "./api";
import { RelationList } from "./RelationList";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "notfound" }
  | { status: "ok"; bead: BeadDetail };

export function BeadDetailPage({ project, id }: { project: string; id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void fetchBead(project, id).then(
      (bead) => setState({ status: "ok", bead }),
      (error: unknown) =>
        setState(
          error instanceof BeadNotFoundError
            ? { status: "notfound" }
            : { status: "error", message: error instanceof Error ? error.message : String(error) },
        ),
    );
  }, [project, id, attempt]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  };
  const back = (
    <Link to={`/beads?project=${encodeURIComponent(project)}`} className="text-sm underline underline-offset-2">
      Back to beads
    </Link>
  );

  if (state.status === "notfound") {
    return (
      <section className="flex flex-col gap-4">
        {back}
        <p>Bead not found</p>
      </section>
    );
  }
  const bead = state.status === "ok" ? state.bead : null;
  const closed = bead?.children.filter((c) => c.status === "closed").length ?? 0;
  const total = bead?.children.length ?? 0;

  return (
    <section className="flex flex-col gap-4">
      {back}
      {state.status === "loading" && <p className="text-muted-foreground">Loading bead…</p>}
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>The bead could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{state.message}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {bead !== null && (
        <>
          <header className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">{bead.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono">{bead.id}</span>
              <Badge variant="secondary">{bead.status}</Badge>
              <span>{`P${bead.priority}`}</span>
              <span>{bead.issue_type}</span>
              {bead.labels.map((label) => (
                <Badge key={label} variant="outline">
                  {label}
                </Badge>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              {[
                bead.owner && `Owner ${bead.owner}`,
                bead.assignee && `Assignee ${bead.assignee}`,
                `Created ${new Date(bead.created_at).toLocaleString()}`,
                `Updated ${new Date(bead.updated_at).toLocaleString()}`,
                `${bead.comment_count} comment${bead.comment_count === 1 ? "" : "s"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </header>
          {bead.description === null ? (
            <p className="text-muted-foreground">No description.</p>
          ) : (
            <p className="whitespace-pre-wrap break-words">{bead.description}</p>
          )}
          <RelationList title="Depends on" project={project} items={bead.dependencies} />
          <RelationList title="Blocks" project={project} items={bead.dependents} />
          {total > 0 && (
            <div className="flex flex-col gap-2">
              <ProgressBar label="Children closed" percent={(closed / total) * 100} />
              <span className="text-sm">{`${closed} of ${total} closed`}</span>
            </div>
          )}
          <RelationList title="Children" project={project} items={bead.children} />
        </>
      )}
    </section>
  );
}
```

  `App.tsx`: a `beadRoute(pathname)` next to `logRoute` (regexp `^\/beads\/([^/]+)\/([^/]+)$`, `decodeURIComponent` inside `try`, `null` on failure), rendering `<BeadDetailPage key={`${bead.project}/${bead.id}`} project={...} id={...} />` before the `/beads` list case.

  `ProjectCard.tsx`: in `BeadsBlock` replace the epic's `MaybeLink` (Scotty) with `<Link to={`/beads/${encodeURIComponent(projectName)}/${encodeURIComponent(epic.id)}`}>`; give `BeadsBlock` a `projectName` prop (the project's `name`) and drop its `scottyUrl` prop. The project name keeps its `MaybeLink href={project.scotty_url}`.

- [ ] **Step 3:** run `pnpm -C frontend test --run && pnpm -C frontend lint && pnpm -C frontend typecheck && pnpm -C frontend build && uv --directory backend run pytest -q`; expect all green.

## Integration
- **Branch**: `feat/gin-console-rm-beads-native` (one worktree for change A)
- **Merge strategy**: sequential

## Validation
- [ ] `uv --directory backend run pytest`, `ruff check .`, `mypy` clean
- [ ] `pnpm -C frontend test --run`, `lint`, `typecheck`, `build` clean
- [ ] Every REQ-ID of the delta appears in at least one test (`gin-workflow specs trace --change gin-console-rm-beads-native`)
- [ ] Manual (live host, after `pnpm -C frontend build && systemctl --user restart gin-console`): `/beads?project=qwikfone` lists the unfinished beads (about 80), `Show closed` brings the total to about 490, search and each filter narrow the list and survive F5, a bead opens with its dependencies, dependents and (for an epic) children with progress, and the epics on the Projects page open the console's bead page

## Notes
- Model guidance is planning metadata, not Beads state.
- Change A is one of three under the epic: when it ships, archive the change but do NOT close `gin-console-rm-beads-native`; changes B (Board and Focus) and C (Scotty parity and retirement) follow as `gin-console-rm-beads-native-<slug>` change folders under the same epic.
- `bd show` has no `dependents`; the plan gets them (and an epic's children, closed ones included) from `bd dep list --direction up`. If a bead has no `dependency_type` on a row, that row is dropped.
- `quota.source.clean` is imported by `beads.models` rather than adding a fourth copy of the surrogate cleaner; a shared helper module would be a separate cleanup.
- Rendering Markdown, comment text and searching descriptions are deliberately left out.
