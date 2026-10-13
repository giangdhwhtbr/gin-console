# Plan: Projects dashboard

Epic: gin-console-rm-projects-dashboard
Spec: docs/changes/gin-console-rm-projects-dashboard-dashboard/ (proposal.md, spec-delta.md, design.md, tests.md)

## Objective

`GET /api/projects` returns each project's gin-workflow state and Beads summary (read-only, cached 5 s); the Projects page shows them as cards with Scotty links and refreshes itself every 10 s.

## Goal, Architecture, Tech Stack (from the spec)

- Goal: one screen showing every configured project's gin-workflow state and a Beads summary.
- Architecture: one process. A new collector in the projects context runs `gin-workflow` and `bd` with `cwd=project.path`, caches per project for 5 s, and the existing router merges the result into the project entries. The React page polls the same endpoint.
- Tech stack: Python 3.12, FastAPI, pydantic v2, pytest, ruff, mypy; React, TypeScript, Tailwind, shadcn/ui, vitest, Testing Library.

## Global Constraints

- Read-only: only `gin-workflow state --format json`, `bd list`, `bd ready`, `bd blocked` are run; project paths come only from config.
- Single machine, Tailscale-only access; no authentication.
- Non-goals: bead search or filter UI, any write, a project detail page, a background worker.
- Automated tests carry the REQ-ID in the test name or a comment.
- `bd list` and `bd ready` default to a result cap (50 and 100); always pass `--limit 0`.

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
- Problem statement: the console lists projects but shows nothing about their state.
- Success criteria: every scenario in `spec-delta.md` has a passing test; `verify.checks` pass; the live service at `:8443` shows the three configured projects with stage, gates, counts and epics.
- Constraints and non-goals: see Global Constraints.

## Approach Options
### Option 1: Cache on demand with a per-project TTL (selected in discuss)
- Summary: collect when a request finds the cache older than 5 s; a lock per project serializes overlapping requests.
- Pros: nothing runs when nobody looks; no background lifecycle.
- Cons: the first request after an idle period waits for the commands.

### Option 2: Background worker
- Summary: refresh on a timer, requests read the cache.
- Pros: data always warm.
- Cons: commands run even when nobody watches; extra lifecycle.

### Recommended Approach
- Selected option: Option 1.
- Reasoning: confirmed in discuss.

## Scope
- In scope: REQ-CONFIG-004, REQ-SERVER-003 (modified), REQ-SERVER-005..008, REQ-UI-003..007.
- Out of scope: everything under non-goals.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Three tracks in a strict chain (config, then API, then UI); one agent working in order is simplest.
```

## File Map

| File | Responsibility | Track |
|---|---|---|
| `backend/src/gin_console/config.py` (modify) | `server.scotty_base_url` | 1 |
| `backend/tests/test_config.py` (modify) | config tests | 1 |
| `config.example.yaml` (modify) | document the key | 1 |
| `backend/src/gin_console/projects/models.py` (modify) | response models | 2 |
| `backend/src/gin_console/projects/collect.py` (create) | run commands, shape blocks, cache | 2 |
| `backend/src/gin_console/projects/source.py` (modify) | merge blocks and `scotty_url` | 2 |
| `backend/src/gin_console/projects/router.py` (modify) | own the collector, collect in parallel | 2 |
| `backend/tests/test_collect.py` (create) | collector tests | 2 |
| `backend/tests/test_app.py` (modify) | API shape tests | 2 |
| `frontend/src/features/projects/api.ts` (modify) | types and guards | 3 |
| `frontend/src/features/projects/ProjectCard.tsx` (create) | one card | 3 |
| `frontend/src/features/projects/ProjectsPage.tsx` (modify) | cards, polling | 3 |
| `frontend/src/features/projects/ProjectsPage.test.tsx` (modify) | UI tests | 3 |

## Tasks

### Track 1: Config `scotty_base_url`
- **Dependencies**: none
- **Requirements**: REQ-CONFIG-004
- **Files**: modify `backend/src/gin_console/config.py` (`ServerSettings`, lines 25-29), `backend/tests/test_config.py`, `config.example.yaml`
- **Provider role**: `backend`
- **Reasoning**: `low`
- **Acceptance criteria**: a valid http/https URL loads; a value without scheme or host fails startup with a message naming `scotty_base_url`; absent means `None`.
- **Estimated complexity**: low

Interfaces produced: `ServerSettings.scotty_base_url: str | None`.

- [ ] **Step 1: failing tests** appended to `backend/tests/test_config.py` (reuse the file's existing loader helper pattern: write YAML to `tmp_path`, call `load_settings`):

```python
# REQ-CONFIG-004
def test_config_004_scotty_base_url_valid(tmp_path: Path) -> None:
    path = tmp_path / "c.yaml"
    path.write_text("server: {scotty_base_url: 'https://host.example.ts.net'}\n")
    assert load_settings(path).server.scotty_base_url == "https://host.example.ts.net"


# REQ-CONFIG-004
@pytest.mark.parametrize("value", ["host.example.ts.net", "ftp://host", "https://"])
def test_config_004_scotty_base_url_invalid(tmp_path: Path, value: str) -> None:
    path = tmp_path / "c.yaml"
    path.write_text(f"server: {{scotty_base_url: '{value}'}}\n")
    with pytest.raises(ConfigError, match="scotty_base_url"):
        load_settings(path)
```

Run `uv --directory backend run pytest tests/test_config.py -q`; expect the new tests to fail.

- [ ] **Step 2: implement** in `config.py`, add `from urllib.parse import urlparse` and:

```python
class ServerSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host: str = "127.0.0.1"
    port: int = Field(default=8700, ge=1, le=65535)
    scotty_base_url: str | None = None

    @field_validator("scotty_base_url")
    @classmethod
    def _http_url(cls, value: str | None) -> str | None:
        if value is not None:
            parsed = urlparse(value)
            if parsed.scheme not in ("http", "https") or not parsed.netloc:
                raise ValueError("must be an absolute http or https URL")
        return value
```

Pydantic includes the field name in the error text, so the `ConfigError` message names `scotty_base_url`.

- [ ] **Step 3:** add to `config.example.yaml` under `server:` the line `  scotty_base_url: https://instance-20260515-2304.tail5ca54e.ts.net   # optional; enables Scotty links`.

- [ ] **Step 4:** run `uv --directory backend run pytest tests/test_config.py -q && uv --directory backend run ruff check . && uv --directory backend run mypy`; expect all green.

### Track 2: Collector, cache and API
- **Dependencies**: Track 1
- **Requirements**: REQ-SERVER-003, REQ-SERVER-005, REQ-SERVER-006, REQ-SERVER-007, REQ-SERVER-008
- **Files**: create `backend/src/gin_console/projects/collect.py`, `backend/tests/test_collect.py`; modify `projects/models.py`, `projects/source.py`, `projects/router.py`, `backend/tests/test_app.py`
- **Provider role**: `backend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of the five REQs has a test; commands never run for a missing path; overlapping requests run the commands once.
- **Estimated complexity**: medium

Interfaces produced (consumed by Track 3 as JSON):
`Project{name, path, scotty_id, scotty_url, exists, workflow, beads}`; `workflow`: `{stage, layout, gates: {name: state}}`, `beads`: `{open, in_progress, blocked, ready, epics: [{id, title}]}`, either one or `{error}` or `null`.

- [ ] **Step 1: models.** Replace `models.py`:

```python
from pydantic import BaseModel


class BlockError(BaseModel):
    error: str


class Workflow(BaseModel):
    stage: str
    layout: str
    gates: dict[str, str]


class Epic(BaseModel):
    id: str
    title: str


class Beads(BaseModel):
    open: int
    in_progress: int
    blocked: int
    ready: int
    epics: list[Epic]


class Project(BaseModel):
    name: str
    path: str
    scotty_id: str | None
    scotty_url: str | None
    exists: bool
    workflow: Workflow | BlockError | None
    beads: Beads | BlockError | None
```

- [ ] **Step 2: failing collector tests.** Create `backend/tests/test_collect.py`. A fake `subprocess.run` keyed on `cmd[0:2]`:

```python
import json
import subprocess
import threading
import time
from pathlib import Path
from typing import Any

import pytest

from gin_console.projects import collect
from gin_console.projects.collect import Collector
from gin_console.projects.models import BlockError

STATE = {"stage": "plan", "gates": {"requirement_confirmed": "satisfied"}, "project": {"layout": "sdd"}}
ISSUES = [
    {"id": "e1", "title": "Epic one", "issue_type": "epic", "status": "in_progress"},
    {"id": "e2", "title": "Epic two", "issue_type": "epic", "status": "open"},
    {"id": "e3", "title": "Epic three", "issue_type": "epic", "status": "open"},
    {"id": "t1", "title": "Task", "issue_type": "task", "status": "open"},
]
READY = [{"id": "e2"}, {"id": "t1"}]
BLOCKED = [{"id": "e3"}]


class Fake:
    def __init__(
        self, fail: dict[str, Exception | int] | None = None, issues: list[dict[str, str]] | None = None
    ) -> None:
        self.calls: list[list[str]] = []
        self.fail = fail or {}
        self.issues = ISSUES if issues is None else issues

    def __call__(self, cmd: list[str], **kwargs: Any) -> subprocess.CompletedProcess[str]:
        self.calls.append(cmd)
        failure = self.fail.get(cmd[0])
        if isinstance(failure, Exception):
            raise failure
        if failure:
            return subprocess.CompletedProcess(cmd, failure, "", "boom")
        out = {"gin-workflow": STATE, "list": self.issues, "ready": READY, "blocked": BLOCKED}[
            "gin-workflow" if cmd[0] == "gin-workflow" else cmd[1]
        ]
        return subprocess.CompletedProcess(cmd, 0, json.dumps(out), "")


def patch(monkeypatch: pytest.MonkeyPatch, fake: Fake) -> None:
    monkeypatch.setattr(collect.subprocess, "run", fake)


# REQ-SERVER-005
def test_server_005_workflow_shape(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Fake())
    workflow, _ = Collector().get("p", tmp_path)
    assert workflow.model_dump() == {
        "stage": "plan", "layout": "sdd", "gates": {"requirement_confirmed": "satisfied"}
    }


# REQ-SERVER-006
def test_server_006_beads_counts_and_epics(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake = Fake()
    patch(monkeypatch, fake)
    _, beads = Collector().get("p", tmp_path)
    assert (beads.open, beads.in_progress, beads.blocked, beads.ready) == (3, 1, 1, 2)
    assert [e.id for e in beads.epics] == ["e1", "e2"]
    assert ["bd", "list", "--status", "open,in_progress", "--limit", "0", "--json"] in fake.calls


# REQ-SERVER-006
def test_server_006_no_active_epics(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Fake(issues=[{"id": "t1", "title": "T", "issue_type": "task", "status": "open"}]))
    _, beads = Collector().get("p", tmp_path)
    assert beads.epics == []


# REQ-SERVER-007
@pytest.mark.parametrize(
    "failure",
    [FileNotFoundError(), subprocess.TimeoutExpired("bd", 10), 1],
)
def test_server_007_beads_error_isolated(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, failure: Exception | int
) -> None:
    patch(monkeypatch, Fake({"bd": failure}))
    workflow, beads = Collector().get("p", tmp_path)
    assert isinstance(beads, BlockError) and beads.error
    assert workflow.stage == "plan"


# REQ-SERVER-007
def test_server_007_invalid_json(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        collect.subprocess, "run",
        lambda cmd, **kw: subprocess.CompletedProcess(cmd, 0, "not json", ""),
    )
    workflow, beads = Collector().get("p", tmp_path)
    assert isinstance(workflow, BlockError) and isinstance(beads, BlockError)


# REQ-SERVER-008
def test_server_008_cache_hit_and_expiry(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake = Fake()
    patch(monkeypatch, fake)
    now = [100.0]
    collector = Collector(ttl=5.0, clock=lambda: now[0])
    collector.get("p", tmp_path)
    first = len(fake.calls)
    now[0] = 102.0
    collector.get("p", tmp_path)
    assert len(fake.calls) == first
    now[0] = 106.0
    collector.get("p", tmp_path)
    assert len(fake.calls) == 2 * first


# REQ-SERVER-008
def test_server_008_overlapping_requests_run_once(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    fake = Fake()

    def slow(cmd: list[str], **kwargs: Any) -> subprocess.CompletedProcess[str]:
        time.sleep(0.05)
        return fake(cmd, **kwargs)

    patch(monkeypatch, slow)  # type: ignore[arg-type]
    collector = Collector()
    threads = [threading.Thread(target=collector.get, args=("p", tmp_path)) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert len(fake.calls) == 4  # state, list, ready, blocked: once
```

Run `uv --directory backend run pytest tests/test_collect.py -q`; expect failures (module missing).

- [ ] **Step 3: implement `collect.py`:**

```python
"""Run the read-only gin-workflow and bd commands for a project and cache the result."""

import json
import subprocess
import threading
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from gin_console.projects.models import Beads, BlockError, Epic, Workflow

TIMEOUT_SECONDS = 10
TTL_SECONDS = 5.0


class CollectError(Exception):
    pass


def _run_json(cmd: list[str], cwd: Path) -> Any:
    try:
        done = subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True, timeout=TIMEOUT_SECONDS, check=False
        )
    except FileNotFoundError:
        raise CollectError(f"{cmd[0]} not found") from None
    except subprocess.TimeoutExpired:
        raise CollectError(f"{cmd[0]} timed out") from None
    if done.returncode != 0:
        raise CollectError(f"{cmd[0]} exited {done.returncode}: {done.stderr.strip()[:200]}")
    try:
        return json.loads(done.stdout)
    except ValueError:
        raise CollectError(f"{cmd[0]} printed invalid JSON") from None


def collect_workflow(path: Path) -> Workflow | BlockError:
    try:
        data = _run_json(["gin-workflow", "state", "--format", "json"], path)
        return Workflow(stage=data["stage"], layout=data["project"]["layout"], gates=data["gates"])
    except CollectError as exc:
        return BlockError(error=str(exc))
    except (KeyError, TypeError, ValidationError) as exc:
        return BlockError(error=f"gin-workflow: unexpected output ({exc!r})")


def collect_beads(path: Path) -> Beads | BlockError:
    try:
        issues = _run_json(["bd", "list", "--status", "open,in_progress", "--limit", "0", "--json"], path)
        ready = _run_json(["bd", "ready", "--limit", "0", "--json"], path)
        blocked = _run_json(["bd", "blocked", "--json"], path)
        ready_ids = {i["id"] for i in ready}
        return Beads(
            open=sum(i["status"] == "open" for i in issues),
            in_progress=sum(i["status"] == "in_progress" for i in issues),
            blocked=len(blocked),
            ready=len(ready),
            epics=[
                Epic(id=i["id"], title=i["title"])
                for i in issues
                if i["issue_type"] == "epic" and (i["status"] == "in_progress" or i["id"] in ready_ids)
            ],
        )
    except CollectError as exc:
        return BlockError(error=str(exc))
    except (KeyError, TypeError, ValidationError) as exc:
        return BlockError(error=f"bd: unexpected output ({exc!r})")


Result = tuple[Workflow | BlockError, Beads | BlockError]


class Collector:
    """Per-project cache; one lock per project so overlapping requests run the commands once."""

    def __init__(self, ttl: float = TTL_SECONDS, clock: Callable[[], float] = time.monotonic) -> None:
        self._ttl = ttl
        self._clock = clock
        self._cache: dict[str, tuple[float, Result]] = {}
        self._locks: dict[str, threading.Lock] = {}

    def get(self, name: str, path: Path) -> Result:
        with self._locks.setdefault(name, threading.Lock()):
            hit = self._cache.get(name)
            if hit is not None and self._clock() - hit[0] < self._ttl:
                return hit[1]
            result = (collect_workflow(path), collect_beads(path))
            self._cache[name] = (self._clock(), result)
            return result
```

- [ ] **Step 4:** run `uv --directory backend run pytest tests/test_collect.py -q`; expect pass.

- [ ] **Step 5: failing API tests.** Move `Fake`, `STATE`, `ISSUES`, `READY`, `BLOCKED` from `test_collect.py` into `backend/tests/fakes.py` and import them in both files. In `test_app.py` change `make_client` to:

```python
def make_client(
    tmp_path: Path,
    projects: list[ProjectEntry],
    built: bool = True,
    scotty_base_url: str | None = None,
) -> TestClient:
    static = tmp_path / "dist"
    static.mkdir()
    if built:
        (static / "index.html").write_text("<html>console</html>")
        (static / "app.js").write_text("console.log(1)")
    settings = Settings(server=ServerSettings(scotty_base_url=scotty_base_url), projects=projects)
    return TestClient(create_app(settings, static_dir=static))


@pytest.fixture
def fake(monkeypatch: pytest.MonkeyPatch) -> Fake:
    fake = Fake()
    monkeypatch.setattr(collect.subprocess, "run", fake)
    return fake
```

(imports: `from gin_console.config import ProjectEntry, ServerSettings, Settings`, `from gin_console.projects import collect`, `from tests.fakes import Fake` or the package-relative form the existing tests use.) Update the two existing REQ-SERVER-003 tests to take the `fake` fixture; in the first, the expected list becomes:

```python
WORKFLOW = {"stage": "plan", "layout": "sdd", "gates": {"requirement_confirmed": "satisfied"}}
BEADS = {
    "open": 3, "in_progress": 1, "blocked": 1, "ready": 2,
    "epics": [{"id": "e1", "title": "Epic one"}, {"id": "e2", "title": "Epic two"}],
}

assert client.get("/api/projects").json() == [
    {"name": "present", "path": str(present), "scotty_id": "p", "scotty_url": None,
     "exists": True, "workflow": WORKFLOW, "beads": BEADS},
    {"name": "absent", "path": str(tmp_path / "absent"), "scotty_id": None, "scotty_url": None,
     "exists": False, "workflow": None, "beads": None},
]
```

and `test_server_003_path_appears_later` is unchanged apart from the `fake` fixture. Add:

```python
# REQ-SERVER-003
def test_server_003_scotty_url(tmp_path: Path, fake: Fake) -> None:
    (tmp_path / "s").mkdir()
    client = make_client(
        tmp_path, [ProjectEntry(name="s", path=tmp_path / "s", scotty_id="scotty")],
        scotty_base_url="https://h/",
    )
    assert client.get("/api/projects").json()[0]["scotty_url"] == "https://h/p/scotty"


# REQ-SERVER-003
@pytest.mark.parametrize(
    ("scotty_id", "base"), [(None, "https://h"), ("scotty", None)]
)
def test_server_003_no_scotty_url(
    tmp_path: Path, fake: Fake, scotty_id: str | None, base: str | None
) -> None:
    (tmp_path / "s").mkdir()
    client = make_client(
        tmp_path, [ProjectEntry(name="s", path=tmp_path / "s", scotty_id=scotty_id)],
        scotty_base_url=base,
    )
    assert client.get("/api/projects").json()[0]["scotty_url"] is None


# REQ-SERVER-007
def test_server_007_missing_path_runs_nothing(tmp_path: Path, fake: Fake) -> None:
    client = make_client(tmp_path, [ProjectEntry(name="gone", path=tmp_path / "gone")])
    body = client.get("/api/projects").json()[0]
    assert (body["workflow"], body["beads"]) == (None, None)
    assert fake.calls == []
```

Run `uv --directory backend run pytest -q`; expect the new and updated tests to fail.

- [ ] **Step 6: implement** `source.py`:

```python
"""Projects come from the console config; existence and state are checked on every call."""

from gin_console.config import ProjectEntry, Settings
from gin_console.projects.collect import Collector
from gin_console.projects.models import Project


def build_project(entry: ProjectEntry, settings: Settings, collector: Collector) -> Project:
    exists = entry.path.is_dir()
    base = settings.server.scotty_base_url
    workflow, beads = collector.get(entry.name, entry.path) if exists else (None, None)
    return Project(
        name=entry.name,
        path=str(entry.path),
        scotty_id=entry.scotty_id,
        scotty_url=f"{base.rstrip('/')}/p/{entry.scotty_id}" if base and entry.scotty_id else None,
        exists=exists,
        workflow=workflow,
        beads=beads,
    )
```

and `router.py`:

```python
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter

from gin_console.config import Settings
from gin_console.projects.collect import Collector
from gin_console.projects.models import Project
from gin_console.projects.source import build_project


def build_router(settings: Settings) -> APIRouter:
    router = APIRouter()
    collector = Collector()

    @router.get("/projects")
    def get_projects() -> list[Project]:
        if not settings.projects:
            return []
        with ThreadPoolExecutor(max_workers=len(settings.projects)) as pool:
            return list(pool.map(lambda p: build_project(p, settings, collector), settings.projects))

    return router
```

(`list_projects` is removed; grep for other callers first: `grep -rn list_projects backend/` and update them.)

- [ ] **Step 7:** run `uv --directory backend run pytest -q && uv --directory backend run ruff check . && uv --directory backend run mypy`; expect all green.

### Track 3: Dashboard UI
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-003, REQ-UI-004, REQ-UI-005, REQ-UI-006, REQ-UI-007
- **Files**: modify `frontend/src/features/projects/api.ts`, `ProjectsPage.tsx`, `ProjectsPage.test.tsx`; create `frontend/src/features/projects/ProjectCard.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of the five REQs has a vitest test; REQ-UI-001 and REQ-UI-002 tests still pass (adapted to cards); polling pauses while the tab is hidden.
- **Estimated complexity**: medium

Interfaces consumed: the JSON shape from Track 2.

- [ ] **Step 1: types and guards** in `api.ts`. Add:

```ts
export type BlockError = { error: string };
export type Workflow = { stage: string; layout: string; gates: Record<string, string> };
export type Beads = {
  open: number;
  in_progress: number;
  blocked: number;
  ready: number;
  epics: { id: string; title: string }[];
};
export type Project = {
  name: string;
  path: string;
  scotty_id: string | null;
  scotty_url: string | null;
  exists: boolean;
  workflow: Workflow | BlockError | null;
  beads: Beads | BlockError | null;
};

export function isBlockError(value: unknown): value is BlockError {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string";
}
```

Extend `isProject` to require `scotty_url` string|null and `workflow`/`beads` to be `null` or an object (`typeof === "object"`); the card narrows with `isBlockError`, and treats any other object as data. Because `Project` types the blocks, cast the checked object once at the end of the guard (`value is Project`) — the guard is the single trust boundary.

- [ ] **Step 2: failing tests.** Rewrite `ProjectsPage.test.tsx`: keep `json` and `afterEach`, replace `rowOf` with `const cardOf = (name: string) => screen.getByRole("article", { name })`, add a `project()` factory with defaults (`scotty_url: null, workflow: null, beads: null, exists: true`), and cover (each test carries its REQ-ID in the title):

  - REQ-UI-001 / REQ-UI-002: the two existing tests, adapted to `cardOf(...)`.
  - REQ-UI-003: workflow `{stage: "plan", layout: "sdd", gates: {requirement_confirmed: "satisfied", plan_approved: "unmet"}}` -> card has text `plan`, `requirement_confirmed: satisfied`, `plan_approved: unmet`.
  - REQ-UI-004: beads `{open: 3, in_progress: 1, blocked: 0, ready: 2, epics: [{id: "e1", title: "Epic one"}]}` -> card shows the four counts (labelled `open 3`, `in progress 1`, `blocked 0`, `ready 2`) and `e1` + `Epic one`; with `epics: []` -> "no active epics".
  - REQ-UI-005: `scotty_url: "https://h/p/scotty"` -> link named `scotty` has that `href`, epic link href is `https://h/p/scotty?bead=e1`, both `target="_blank"` and `rel="noopener noreferrer"`; with `scotty_url: null` -> `queryByRole("link")` is null.
  - REQ-UI-006: `vi.useFakeTimers({ shouldAdvanceTime: true })`; after the first load advance 10 s -> `fetch` called twice and the list never replaced by "Loading"; set `document.visibilityState` to `hidden` (`vi.spyOn(document, "visibilityState", "get")`), advance 10 s -> still 2 calls; set `visible` and dispatch `visibilitychange` -> 3 calls; failing second fetch -> old list still shown, `alert` visible, Retry button calls fetch again.
  - REQ-UI-007: `beads: {error: "bd not found"}` with workflow data -> card shows `bd not found` and the stage.

Run `pnpm -C frontend test --run`; expect failures.

- [ ] **Step 3: `ProjectCard.tsx`:**

```tsx
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { isBlockError, type Beads, type Project, type Workflow } from "./api";

function Maybe({ href, children }: { href: string | null; children: ReactNode }) {
  if (href === null) return <>{children}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
      {children}
    </a>
  );
}

const gateVariant = (state: string) =>
  state === "satisfied" ? "default" : state.startsWith("waived") ? "secondary" : "outline";

function WorkflowBlock({ workflow }: { workflow: Workflow }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant="secondary">{workflow.stage}</Badge>
      {Object.entries(workflow.gates).map(([gate, state]) => (
        <Badge key={gate} variant={gateVariant(state)}>{`${gate}: ${state}`}</Badge>
      ))}
    </div>
  );
}

function BeadsBlock({ beads, scottyUrl }: { beads: Beads; scottyUrl: string | null }) {
  const counts: [string, number][] = [
    ["open", beads.open],
    ["in progress", beads.in_progress],
    ["blocked", beads.blocked],
    ["ready", beads.ready],
  ];
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap gap-3">
        {counts.map(([label, n]) => (
          <span key={label}>{`${label} ${n}`}</span>
        ))}
      </div>
      {beads.epics.length === 0 ? (
        <p className="text-muted-foreground">no active epics</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {beads.epics.map((epic) => (
            <li key={epic.id}>
              <Maybe href={scottyUrl === null ? null : `${scottyUrl}?bead=${encodeURIComponent(epic.id)}`}>
                <span className="font-mono">{epic.id}</span>
              </Maybe>{" "}
              {epic.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  const { workflow, beads } = project;
  return (
    <article aria-label={project.name} className="flex flex-col gap-3 rounded-lg border p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="font-medium"><Maybe href={project.scotty_url}>{project.name}</Maybe></h2>
        {!project.exists && <Badge variant="destructive">missing</Badge>}
        <span className="w-full break-all font-mono text-sm text-muted-foreground">{project.path}</span>
      </header>
      {workflow !== null &&
        (isBlockError(workflow) ? (
          <p className="text-sm text-destructive">{`workflow: ${workflow.error}`}</p>
        ) : (
          <WorkflowBlock workflow={workflow} />
        ))}
      {beads !== null &&
        (isBlockError(beads) ? (
          <p className="text-sm text-destructive">{`beads: ${beads.error}`}</p>
        ) : (
          <BeadsBlock beads={beads} scottyUrl={project.scotty_url} />
        ))}
    </article>
  );
}
```

The epic link text is the id only in the link; the id and title must both appear in the card (REQ-UI-004).

- [ ] **Step 4: `ProjectsPage.tsx`.** Replace the state and table with cards and polling:

```tsx
type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; projects: Project[]; error: string | null };

const REFRESH_MS = 10_000;
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

// inside ProjectsPage
const load = useCallback(() => {
  void fetchProjects().then(
    (projects) => setState({ status: "ok", projects, error: null }),
    (error: unknown) =>
      setState((prev) =>
        prev.status === "ok"
          ? { ...prev, error: messageOf(error) }
          : { status: "error", message: messageOf(error) },
      ),
  );
}, []);

useEffect(() => {
  load();
  const refresh = () => {
    if (document.visibilityState === "visible") load();
  };
  const id = setInterval(refresh, REFRESH_MS);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    clearInterval(id);
    document.removeEventListener("visibilitychange", refresh);
  };
}, [load]);

const retry = () => {
  if (state.status === "error") setState({ status: "loading" });
  load();
};
```

Render: the existing loading line; one shared error `Alert` for `state.status === "error"` (message `state.message`) **or** `state.status === "ok" && state.error !== null` (message `state.error`), both with the Retry button; the existing empty-state paragraph; and for a non-empty list `<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{state.projects.map((p) => <ProjectCard key={p.name} project={p} />)}</div>`. Remove the `Table*` imports and the now-unused `Badge` import.

- [ ] **Step 5:** run `pnpm -C frontend test --run && pnpm -C frontend lint && pnpm -C frontend typecheck && pnpm -C frontend build`; expect all green.

## Integration
- **Branch**: `feat/gin-console-rm-projects-dashboard` (one worktree for the epic)
- **Merge strategy**: sequential

## Validation
- [ ] `uv --directory backend run pytest`, `ruff`, `mypy` clean
- [ ] `pnpm -C frontend test --run`, `lint`, `typecheck`, `build` clean
- [ ] Every REQ-ID of the delta appears in at least one test (`gin-workflow specs trace --change gin-console-rm-projects-dashboard`)
- [ ] Manual (live host, after `systemctl --user restart gin-console` and `scotty_base_url` set in `~/.config/gin-console/config.yaml`): `curl -s 127.0.0.1:8700/api/projects` shows `workflow` and `beads` for qwikfone, scotty and gin-workflow; the page at `:8443` shows cards and a Scotty link; stopping `bd` access (renaming a project path in a scratch config) shows the per-block error or the "missing" badge only

## Notes
- Model guidance is planning metadata, not Beads state.
- Docker image: `gin-workflow` and `bd` are already installed there, so the dashboard works in the container without changes; the container needs the same `scotty_base_url` in its mounted config.
- Deferred on purpose: the first request after an idle period waits for the commands (a few seconds on qwikfone, 47 ready issues); add a warm-up only if it is noticeable.
