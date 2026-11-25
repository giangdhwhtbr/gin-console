# Plan: Requirements and traceability

Epic: gin-console-rm-requirements
Spec: `01-proposal.md`, `02-spec-delta.md`, and `03-design.md` in this folder.

## Objective

A Requirements page where a BA sees every requirement with its status, sign-off, beads and cases, reads change folders, and uses confirmed mockups.

Architecture: a new backend context runs `gin specs trace --all` and `gin specs reqs`, and reads change and asset folders through one path check; a new frontend feature shows three sections and a change page.

Tech stack: FastAPI, pydantic, pytest, ruff, mypy strict; React 19, Tailwind 4, vitest; Playwright with gin-qa.

Done when every scenario of the ADDED and MODIFIED REQs has a test naming its REQ, all checks in Validation pass, and TC-1 passes on the Tailscale build.

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
- **Problem statement:** nothing joins requirements, sign-off, beads and tests in one view.
- **Success criteria:** those of `01-proposal.md`.
- **Global constraints** (from the spec):
  - The console stays read-only; it starts `gin` only, never `bd` or `gin-qa`, for this page.
  - The project summary endpoints still start no process (REQ-SERVER-006, REQ-SERVER-010).
  - "`beads` and `cases` that the trace gives as null SHALL stay null": unknown is never shown as empty.
  - Status order: `failing`, `building`, `unknown`, `covered`, `untested`. "Test files SHALL NOT change the status."
  - "run at most one of each per project at a time", kept 60 seconds, 30 seconds timeout.
  - Project files are read only in `docs/changes` and the asset folders of `docs/specs`, after resolving symbolic links.
  - "an iframe whose `sandbox` attribute is exactly `allow-scripts`".
  - Markdown is rendered without raw HTML.
  - No page sideways scroll at 360px; text only at 12, 13, 14, 16, 20, 28 and 40px (REQ-UI-137).
  - `beads/` and `milestones/` backend contexts are not edited.
- **Non-goals:** editing specs or sign-off, running tests, evidence images, the readiness checklist, legacy layouts, custom `artifacts.*` paths.

## Approach Options
### Option 1: Two backend and three frontend tracks, shell last
- Summary: gin data; files; matrix; changes and mockups; navigation; then QA.
- Pros: the security-relevant file serving is reviewed on its own; Tracks 1 and 3 share no file.
- Cons: the page is reachable only after Track 5.

### Option 2: One backend and one frontend track
- Summary: fewer handoffs.
- Pros: less coordination.
- Cons: the path checks would be reviewed inside a large diff.

### Recommended Approach
- Selected option: Option 1.
- Rationale: small reviewable tracks, and file serving gets the strongest route.

## Scope
- In scope: REQ-REQUIREMENTS-001 to 019 and the MODIFIED REQs of `ui`.
- Out of scope: the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend) and Track 3 (frontend) share no file and run together; Tracks 2, 4, 5, 6 and 7 follow their dependencies.
```

## Tasks

### Track 1: Backend trace, status and sign-off
- **Dependencies**: none
- **Requirements**: REQ-REQUIREMENTS-001, REQ-REQUIREMENTS-002, REQ-REQUIREMENTS-003, REQ-REQUIREMENTS-004, REQ-REQUIREMENTS-005, REQ-REQUIREMENTS-006
- **Files**:
  - Create `backend/src/gin_console/requirements/__init__.py`
  - Create `backend/src/gin_console/requirements/models.py`
  - Create `backend/src/gin_console/requirements/source.py`
  - Create `backend/src/gin_console/requirements/service.py`
  - Create `backend/src/gin_console/requirements/router.py`
  - Modify `backend/src/gin_console/app.py:20-30` (imports), `create_app` (parameter `run_gin` and the router beside the milestones router)
  - Create `backend/tests/fake_gin.py`
  - Test `backend/tests/test_requirements_source.py`
  - Test `backend/tests/test_requirements_service.py`
  - Test `backend/tests/test_requirements_api.py`
- **Interfaces**: produces `GinRunner`, `run_gin`, `RequirementsError`, `load_trace(run, cwd) -> Trace`, `load_reqs(run, cwd) -> Reqs`, `build_list(trace) -> RequirementList`, `build_router(settings, run, clock, on_refresh)`; consumes `run_json`, `CollectError`, `KeyedCache`.
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** one new context modelled on `milestones/`; the rules and edge cases are listed in the spec.
- **Acceptance criteria**: every scenario of the Requirements has a passing test; no test starts gin; ruff and mypy pass.
- **Estimated complexity**: medium

Steps:

1. Write `backend/tests/fake_gin.py`, from the gin 3.5.3 output shape:
   ```python
   from pathlib import Path
   from typing import Any


   def req(ident: str = "REQ-AUTH-001", **fields: Any) -> dict[str, Any]:
       return {
           "id": ident, "title": "Lock out", "capability": "auth", "state": "living",
           "hash8": "1a2b3c4d", "source": "docs/specs/auth/spec.md:12",
           "changes": [], "signoff": None, "beads": [], "cases": [], "tests": [], **fields,
       }


   def trace(*rows: dict[str, Any], **fields: Any) -> dict[str, Any]:
       return {"schema": 1, "layout": "sdd", "requirements": list(rows),
               "warnings": [], "skipped": [], **fields}


   class FakeGin:
       """Answers `specs trace` and `specs reqs`; an exception in `outputs` is raised."""

       def __init__(self, outputs: dict[str, Any]) -> None:
           self.outputs = outputs
           self.calls: list[list[str]] = []

       def __call__(self, args: list[str], cwd: Path) -> Any:
           self.calls.append(args)
           answer = self.outputs[args[1]]
           if isinstance(answer, Exception):
               raise answer
           return answer
   ```
2. Write `test_requirements_service.py` with the status table, one row per scenario of REQ-REQUIREMENTS-002:
   ```python
   import pytest
   from fake_gin import req, trace
   from gin_console.requirements.models import Trace
   from gin_console.requirements.service import build_list

   DONE = [{"id": "a-1", "title": "A", "status": "closed"}]
   OPEN = [{"id": "a-1", "title": "A", "status": "open"}]


   def cases(*results: str) -> list[dict[str, str]]:
       return [{"id": f"TC-AUTH-{n:03d}", "effective_result": r} for n, r in enumerate(results, 1)]


   # REQ-REQUIREMENTS-002
   @pytest.mark.parametrize(
       ("fields", "status", "reasons"),
       [
           ({"beads": DONE, "cases": cases("passed", "passed")}, "covered", []),
           ({"cases": cases("passed", "outdated")}, "untested", ["outdated"]),
           ({"cases": [], "tests": ["t.py"]}, "untested", ["no case"]),
           ({"beads": OPEN, "cases": cases("failed")}, "failing", ["failed"]),
           ({"beads": DONE, "cases": None}, "unknown", ["cases unknown"]),
           ({"beads": OPEN, "cases": None}, "building", ["open beads"]),
           ({"beads": None, "cases": cases("passed")}, "covered", []),
           ({"state": "proposed"}, "building", ["proposed"]),
           ({"cases": cases("blocked")}, "untested", ["blocked"]),
           ({"state": "removed", "hash8": None, "source": None}, None, []),
       ],
   )
   def test_requirements_002_status(fields, status, reasons) -> None:  # annotate per mypy
       row = build_list(Trace.model_validate(trace(req(**fields)))).requirements[0]
       assert (row.status, row.reasons) == (status, reasons)
   ```
   Add one test per scenario of REQ-REQUIREMENTS-001 and 003 in the same file. Run `uv run --directory backend pytest tests/test_requirements_service.py`; expect import errors.
3. Write `models.py`:
   ```python
   from typing import Any, Literal
   from pydantic import BaseModel, Field

   State = Literal["living", "proposed", "removed"]
   Status = Literal["failing", "building", "unknown", "covered", "untested"]
   SignoffState = Literal["none", "waived", "current", "changed", "unknown version"]
   Cause = Literal["outdated", "schema"]


   class TraceSignoff(BaseModel):
       at: str | None = None
       actor: str | None = None
       evidence: str | None = None
       source: str | None = None
       waived: bool = False
       change: str | None = None
       current: bool | None = None


   class TraceChange(BaseModel):
       change: str
       epic: str | None = None
       op: str
       archived: str | None = None
       signoff: TraceSignoff | None = None


   class BeadRef(BaseModel):
       id: str
       title: str
       status: str


   class CaseRef(BaseModel):
       id: str
       effective_result: str


   class TraceRequirement(BaseModel):
       id: str
       title: str
       capability: str
       state: State
       source: str | None = None
       changes: list[TraceChange] = Field(default_factory=list)
       signoff: TraceSignoff | None = None
       beads: list[BeadRef] | None = None
       cases: list[CaseRef] | None = None
       tests: list[str] = Field(default_factory=list)


   class Trace(BaseModel):
       layout: str
       requirements: list[TraceRequirement]
       warnings: list[str] = Field(default_factory=list)
       skipped: list[Any] = Field(default_factory=list)


   class Signoff(BaseModel):
       state: SignoffState
       actor: str | None = None
       at: str | None = None
       change: str | None = None
       evidence: str | None = None
       source: str | None = None


   class ChangeRef(BaseModel):
       folder: str  # <archived>-<change>, or <change> while open
       change: str
       epic: str | None
       op: str
       archived: str | None


   class RequirementRow(BaseModel):
       id: str
       title: str
       capability: str
       state: State
       status: Status | None
       reasons: list[str]
       signoff: Signoff
       changes: list[ChangeRef]
       beads: list[BeadRef] | None
       cases: list[CaseRef] | None
       tests: list[str]


   class RequirementList(BaseModel):
       layout: str
       requirements: list[RequirementRow]
       warnings: list[str]
       skipped: list[str]


   class Scenario(BaseModel):
       title: str
       given: list[str] = Field(default_factory=list)
       when: list[str] = Field(default_factory=list)
       then: list[str] = Field(default_factory=list)


   class ReqEntry(BaseModel):
       id: str
       title: str
       source: str | None = None
       section: str = ""
       scenarios: list[Scenario] = Field(default_factory=list)


   class Reqs(BaseModel):
       requirements: list[ReqEntry]


   class RequirementScenarios(BaseModel):
       id: str
       title: str
       source: str | None
       scenarios: list[Scenario]
   ```
4. Write `service.py`:
   ```python
   from gin_console.requirements import models as m


   def folder_of(change: m.TraceChange) -> str:
       return f"{change.archived}-{change.change}" if change.archived else change.change


   def status_of(row: m.TraceRequirement) -> tuple[m.Status | None, list[str]]:
       if row.state == "removed":
           return None, []
       results = {c.effective_result for c in row.cases or []}
       if "failed" in results:
           return "failing", ["failed"]
       building = ["proposed"] if row.state == "proposed" else []
       if any(b.status != "closed" for b in row.beads or []):
           building.append("open beads")
       if building:
           return "building", building
       if row.cases is None:
           return "unknown", ["cases unknown"]
       if not row.cases:
           return "untested", ["no case"]
       reasons = sorted(results - {"passed"})
       return ("untested", reasons) if reasons else ("covered", [])


   def signoff_of(signoff: m.TraceSignoff | None) -> m.Signoff:
       if signoff is None:
           return m.Signoff(state="none")
       state: m.SignoffState = "unknown version"
       if signoff.waived:
           state = "waived"
       elif signoff.current is not None:
           state = "current" if signoff.current else "changed"
       return m.Signoff(
           state=state, actor=signoff.actor, at=signoff.at, change=signoff.change,
           evidence=signoff.evidence, source=signoff.source,
       )


   def _row(row: m.TraceRequirement) -> m.RequirementRow:
       status, reasons = status_of(row)
       return m.RequirementRow(
           id=row.id, title=row.title, capability=row.capability, state=row.state,
           status=status, reasons=reasons, signoff=signoff_of(row.signoff),
           changes=[
               m.ChangeRef(folder=folder_of(c), change=c.change, epic=c.epic, op=c.op,
                           archived=c.archived)
               for c in row.changes
           ],
           beads=row.beads, cases=row.cases, tests=row.tests,
       )


   def build_list(trace: m.Trace) -> m.RequirementList:
       return m.RequirementList(
           layout=trace.layout,
           requirements=[_row(r) for r in trace.requirements],
           warnings=trace.warnings,
           skipped=[str(s) for s in trace.skipped],
       )


   def find_scenarios(reqs: m.Reqs, ident: str) -> m.RequirementScenarios | None:
       found = [r for r in reqs.requirements if r.id == ident]
       if not found:
           return None
       entry = next((r for r in found if r.section == "LIVING"), found[0])
       return m.RequirementScenarios(**entry.model_dump(exclude={"section"}))
   ```
   Rerun step 2; expect pass.
5. Write `test_requirements_source.py`: monkeypatch `subprocess.run` with the `Cli` stand-in pattern of `test_milestones_api.py:24-35`; assert the argument list, and the cause for exit 2 with stderr `the following arguments are required: --change`, `unrecognized arguments: --all` and `invalid choice: 'trace'` (each `outdated`), exit 1 (null), `subprocess.TimeoutExpired` (null, message holds "timed out"), schema 2 (`schema`), a non-object (null). Expect failures, then write `source.py`:
   ```python
   """Requirements of a project via `gin specs`; the only module that knows its JSON."""

   from pathlib import Path
   from typing import Any, Protocol

   from pydantic import ValidationError

   from gin_console.projects.collect import CollectError, run_json
   from gin_console.requirements.models import Cause, Reqs, Trace

   GIN_TIMEOUT = 30.0
   SCHEMA = 1
   _OLD = ("arguments are required: --change", "unrecognized arguments: --all", "invalid choice: 'trace'")


   class RequirementsError(Exception):
       """gin could not answer; `cause` names a reason the page explains with its fix."""

       def __init__(self, message: str, cause: Cause | None = None) -> None:
           super().__init__(message)
           self.cause: Cause | None = cause


   class GinRunner(Protocol):
       def __call__(self, args: list[str], cwd: Path) -> Any: ...


   def run_gin(args: list[str], cwd: Path) -> Any:
       try:
           return run_json(["gin", *args], cwd, timeout=GIN_TIMEOUT)
       except CollectError as exc:
           if exc.returncode == 2 and any(text in exc.stderr for text in _OLD):
               raise RequirementsError("this gin has no specs trace --all", "outdated") from None
           raise RequirementsError(str(exc)) from None


   def load_trace(run: GinRunner, cwd: Path) -> Trace:
       data = run(["specs", "trace", "--all", "--format", "json"], cwd)
       if not isinstance(data, dict):
           raise RequirementsError("gin specs trace output was not understood")
       if data.get("schema") != SCHEMA:
           raise RequirementsError(f"gin reports trace schema {data.get('schema')}", "schema")
       try:
           return Trace.model_validate(data)
       except ValidationError:
           raise RequirementsError("gin specs trace output was not understood") from None


   def load_reqs(run: GinRunner, cwd: Path) -> Reqs:
       try:
           return Reqs.model_validate(run(["specs", "reqs", "--format", "json"], cwd))
       except ValidationError:
           raise RequirementsError("gin specs reqs output was not understood") from None
   ```
6. Write `test_requirements_api.py` with the `make`/`Clock` pattern of `test_milestones_api.py:15-55` and `run_gin=FakeGin(...)`: one test per scenario of REQ-REQUIREMENTS-004, 005, 006. "Two readers" starts two threads against a fake that waits on a `threading.Event` and asserts one trace call. Expect failures, then write `router.py`:
   ```python
   from collections.abc import Callable
   from datetime import datetime, timedelta
   from pathlib import Path

   from fastapi import APIRouter, HTTPException
   from fastapi.responses import JSONResponse

   from gin_console.beads.service import KeyedCache
   from gin_console.config import Settings
   from gin_console.requirements.models import (
       Reqs, RequirementList, RequirementScenarios, Trace,
   )
   from gin_console.requirements.service import build_list, find_scenarios
   from gin_console.requirements.source import (
       GinRunner, RequirementsError, load_reqs, load_trace,
   )

   TTL = timedelta(seconds=60)


   def build_router(
       settings: Settings,
       run: GinRunner,
       clock: Callable[[], datetime],
       on_refresh: list[Callable[[], None]],
   ) -> APIRouter:
       router = APIRouter()
       traces = KeyedCache[str, Trace](TTL, clock)
       reqs = KeyedCache[str, Reqs](TTL, clock)
       on_refresh += [traces.clear, reqs.clear]

       def project_dir(name: str | None) -> Path:
           entry = next((p for p in settings.projects if p.name == name), None)
           if entry is None or not entry.path.is_dir():
               raise HTTPException(status_code=404)
           return entry.path

       def failure(exc: RequirementsError) -> JSONResponse:
           return JSONResponse(status_code=502, content={"error": str(exc), "cause": exc.cause})

       @router.get("/requirements", response_model=RequirementList)
       def get_requirements(project: str | None = None) -> RequirementList | JSONResponse:
           cwd = project_dir(project)
           try:
               return build_list(traces.get(str(project), lambda: load_trace(run, cwd)))
           except RequirementsError as exc:
               return failure(exc)

       @router.get("/requirements/reqs/{project}/{req_id}", response_model=RequirementScenarios)
       def get_scenarios(project: str, req_id: str) -> RequirementScenarios | JSONResponse:
           cwd = project_dir(project)
           try:
               found = find_scenarios(reqs.get(project, lambda: load_reqs(run, cwd)), req_id)
           except RequirementsError as exc:
               return failure(exc)
           if found is None:
               raise HTTPException(status_code=404)
           return found

       return router
   ```
   In `create_app` add `run_gin: GinRunner = default_run_gin` (import `run_gin as default_run_gin`) and include `build_requirements_router(settings, run_gin, clock, on_refresh)` where the milestones router is included.
7. Run `uv run --directory backend pytest && uv run --directory backend ruff check . && uv run --directory backend mypy`; expect pass. Commit `feat(requirements): trace, status and sign-off API (gin-console-rm-requirements)`.

### Track 2: Backend change folders and mockups
- **Dependencies**: Track 1
- **Requirements**: REQ-REQUIREMENTS-007, REQ-REQUIREMENTS-008, REQ-REQUIREMENTS-009, REQ-REQUIREMENTS-010, REQ-REQUIREMENTS-011
- **Files**:
  - Create `backend/src/gin_console/requirements/files.py`
  - Modify `backend/src/gin_console/requirements/models.py` (append the models below)
  - Modify `backend/src/gin_console/requirements/service.py` (append `build_changes`)
  - Modify `backend/src/gin_console/requirements/router.py` (four endpoints)
  - Modify `docs/adr/0004-serve-project-files.md` (Status: accepted)
  - Modify `README.md` (Requirements page, needs `gin specs trace --all`; what it reads)
  - Test `backend/tests/test_requirements_files.py`
  - Test `backend/tests/test_requirements_files_api.py`
- **Interfaces**: consumes Track 1; produces `list_changes(root)`, `read_change(root, name)`, `list_mockups(root)`, `mockup_file(root, capability, day, path)`, and the JSON of `ChangeList`, `ChangeContent`, `MockupList`.
- **Provider role**: `backend`
- **Model:** `opus`
- **Effort:** `high`
- **Why:** serves files and scripts of project checkouts; path and isolation mistakes are security bugs.
- **Acceptance criteria**: every scenario of the Requirements has a passing test, the path tests include `..`, absolute path, NUL byte, a file link and a folder link outside, and a folder that is not confirmed; a 404 never names a path.
- **Estimated complexity**: high

Steps:

1. Append to `models.py`:
   ```python
   class ChangeFolder(BaseModel):
       folder: str
       change: str
       title: str
       epic: str | None
       archived: str | None


   class ChangeRow(ChangeFolder):
       signoff: Signoff | None  # null: the trace does not name the change, or failed
       added: int | None
       modified: int | None
       removed: int | None


   class ChangeList(BaseModel):
       changes: list[ChangeRow]
       error: str | None
       cause: Cause | None


   class ChangeContent(ChangeFolder):
       files: dict[str, str]  # proposal, spec-delta, design, plan, tests


   class Mockup(BaseModel):
       capability: str
       date: str
       confirmed: str
       confirmed_by: str | None
       description: str
       html: list[str]
       images: list[str]
       requirements: list[str]


   class MockupList(BaseModel):
       mockups: list[Mockup]
   ```
2. Write `test_requirements_files.py` (a `tmp_path` project with `docs/changes` and `docs/specs`), one test per scenario of REQ-REQUIREMENTS-007 to 010. Core security test:
   ```python
   # REQ-REQUIREMENTS-010
   @pytest.mark.parametrize("path", ["../../spec.md", "/etc/passwd", "a\0.html", "link.html", "out/x.html", "note.md"])
   def test_requirements_010_outside(project: Path, path: str) -> None:
       assert mockup_file(project, "ui", "2026-11-22", path) is None
   ```
   where the fixture makes `link.html` a link to a file outside and `out` a link to a directory outside. Expect import errors.
3. Write `files.py`:
   ```python
   """Change folders and confirmed assets of a project: the only module that reads these files (ADR 0004)."""

   import os
   import re
   from collections.abc import Iterator
   from pathlib import Path

   from gin_console.requirements.models import ChangeContent, ChangeFolder, Mockup

   PARTS = ("proposal", "spec-delta", "design", "plan", "tests")
   MEDIA = {
       ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
       ".js": "text/javascript; charset=utf-8", ".json": "application/json",
       ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
       ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
       ".woff2": "font/woff2",
   }
   IMAGES = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}
   _NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*")
   _DAY = re.compile(r"\d{4}-\d{2}-\d{2}")
   _ARCHIVED = re.compile(r"(\d{4}-\d{2}-\d{2})-(.+)")
   _EPIC = re.compile(r"^Epic:[ \t]*(\S+)", re.M)
   _TITLE = re.compile(r"^# (.+)$", re.M)
   _CONFIRMED = re.compile(r"^Confirmed:[ \t]*(\d{4}-\d{2}-\d{2})[ \t]*$", re.M)
   _BY = re.compile(r"^Confirmed by:[ \t]*(\S.*)$", re.M)
   _HEADING = re.compile(r"^### (REQ-[A-Z0-9-]+-\d+)")
   _TICKED = re.compile(r"`([^`]+)`")


   def _inside(base: Path, relative: str) -> Path | None:
       """The existing path `relative` names under `base`, links followed; None when it leaves `base`."""
       try:
           root = base.resolve()
           found = (root / relative).resolve()
           return found if found.is_relative_to(root) and found.exists() else None
       except (OSError, ValueError, RuntimeError):  # NUL byte, link loop, unreadable directory
           return None


   def _folder(base: Path, name: str) -> Path | None:
       """A directory directly under `base`; a name that is no plain name, or a link outside, is None."""
       if not _NAME.fullmatch(name):
           return None
       found = _inside(base, name)
       return found if found is not None and found.is_dir() else None


   def _names(base: Path) -> list[str]:
       try:
           return sorted(entry.name for entry in base.iterdir())
       except OSError:
           return []


   def _text(path: Path) -> str:
       try:
           return path.read_text(encoding="utf-8")
       except (OSError, UnicodeDecodeError):
           return "This file could not be read."


   def _parts(folder: Path) -> dict[str, str]:
       found: dict[str, str] = {}
       for number, part in enumerate(PARTS, 1):
           for name in (f"{number:02d}-{part}.md", f"{part}.md"):
               path = _inside(folder, name)
               if path is not None and path.is_file():
                   found[part] = _text(path)
                   break
       return found


   def _describe(name: str, proposal: str, archived: bool) -> ChangeFolder:
       dated = _ARCHIVED.fullmatch(name) if archived else None
       epic, title = _EPIC.search(proposal), _TITLE.search(proposal)
       return ChangeFolder(
           folder=name,
           change=dated[2] if dated else name,
           title=title[1].strip() if title else name,
           epic=epic[1] if epic else None,
           archived=dated[1] if dated else None,
       )


   def _changes(root: Path) -> Iterator[tuple[str, Path, bool]]:
       base = root / "docs" / "changes"
       for parent, archived in ((base, False), (base / "archive", True)):
           for name in _names(parent):
               folder = _folder(parent, name)
               if folder is not None and (archived or name != "archive"):
                   yield name, folder, archived


   def list_changes(root: Path) -> list[ChangeFolder]:
       rows = [_describe(n, _parts(f).get("proposal", ""), a) for n, f, a in _changes(root)]
       still_open = sorted((r for r in rows if r.archived is None), key=lambda r: r.folder)
       done = [r for r in rows if r.archived is not None]
       done.sort(key=lambda r: r.folder)
       done.sort(key=lambda r: r.archived or "", reverse=True)
       return still_open + done


   def read_change(root: Path, name: str) -> ChangeContent | None:
       for found, folder, archived in _changes(root):
           if found == name:
               files = _parts(folder)
               about = _describe(name, files.get("proposal", ""), archived)
               return ChangeContent(**about.model_dump(), files=files)
       return None


   def _confirmed(root: Path, capability: str, day: str) -> tuple[Path, str] | None:
       """The asset folder and its description, only when a BA confirmed it."""
       specs = root / "docs" / "specs"
       if not _NAME.fullmatch(capability) or not _DAY.fullmatch(day):
           return None
       folder = _inside(specs, f"{capability}/assets/{day}")
       if folder is None or not folder.is_dir():
           return None
       description = _inside(folder, "description.md")
       if description is None or not description.is_file():
           return None
       text = _text(description)
       return (folder, text) if _CONFIRMED.search(text) else None


   def _sources(root: Path) -> dict[str, list[str]]:
       """Asset path, relative to docs/specs, to the living requirements that cite it."""
       found: dict[str, list[str]] = {}
       specs = root / "docs" / "specs"
       for capability in _names(specs):
           spec = _inside(specs, f"{capability}/spec.md")
           if spec is None or not spec.is_file():
               continue
           ident = ""
           for line in _text(spec).splitlines():
               heading = _HEADING.match(line)
               if heading:
                   ident = heading[1]
               elif ident and line.startswith("Source:"):
                   for path in _TICKED.findall(line):
                       plain = os.path.normpath(f"{capability}/{path.split('#')[0]}").replace("\\", "/")
                       found.setdefault(plain, []).append(ident)
       return found


   def list_mockups(root: Path) -> list[Mockup]:
       specs = root / "docs" / "specs"
       sources = _sources(root)
       found: list[Mockup] = []
       for capability in _names(specs):
           for day in reversed(_names(specs / capability / "assets")):
               confirmed = _confirmed(root, capability, day)
               if confirmed is None:
                   continue
               folder, text = confirmed
               files = sorted(
                   path.relative_to(folder).as_posix() for path in folder.rglob("*") if path.is_file()
               )
               served = [f for f in files if mockup_file(root, capability, day, f) is not None]
               html = [f for f in served if f.lower().endswith(".html")]
               images = [f for f in served if Path(f).suffix.lower() in IMAGES]
               if not html and not images:
                   continue
               prefix = f"{capability}/assets/{day}"
               used = {
                   ident
                   for path, idents in sources.items()
                   if path == prefix or path.startswith(f"{prefix}/")
                   for ident in idents
               }
               date_line, by = _CONFIRMED.search(text), _BY.search(text)
               found.append(
                   Mockup(
                       capability=capability, date=day, confirmed=date_line[1] if date_line else "",
                       confirmed_by=by[1].strip() if by else None, description=text,
                       html=html, images=images, requirements=sorted(used),
                   )
               )
       return found


   def mockup_file(root: Path, capability: str, day: str, path: str) -> tuple[Path, str] | None:
       """A file of a confirmed folder and its media type; None for anything else."""
       confirmed = _confirmed(root, capability, day)
       if confirmed is None:
           return None
       found = _inside(confirmed[0], path)
       if found is None or not found.is_file():
           return None
       media = MEDIA.get(found.suffix.lower())
       return (found, media) if media is not None else None
   ```
   Rerun; expect pass.
4. Append to `service.py`, with a test per scenario of REQ-REQUIREMENTS-007 first:
   ```python
   def build_changes(
       folders: list[m.ChangeFolder], trace: m.Trace | None, error: str | None, cause: m.Cause | None
   ) -> m.ChangeList:
       ops: dict[str, dict[str, int]] = {}
       signoffs: dict[str, m.TraceSignoff | None] = {}
       for row in trace.requirements if trace else []:
           for change in row.changes:
               key = folder_of(change)
               counts = ops.setdefault(key, {"added": 0, "modified": 0, "removed": 0})
               counts[change.op] = counts.get(change.op, 0) + 1
               signoffs[key] = signoffs.get(key) or change.signoff
       rows = []
       for folder in folders:
           counts = ops.get(folder.folder)
           rows.append(
               m.ChangeRow(
                   **folder.model_dump(),
                   signoff=signoff_of(signoffs[folder.folder]) if counts is not None else None,
                   added=counts["added"] if counts is not None else None,
                   modified=counts["modified"] if counts is not None else None,
                   removed=counts["removed"] if counts is not None else None,
               )
           )
       return m.ChangeList(changes=rows, error=error, cause=cause)
   ```
   A change's own sign-off has no `current`, so its state is `waived`, `none` or `unknown version`; the page shows the person and time, not the version.
5. Write `test_requirements_files_api.py` (the four endpoints; REQ-REQUIREMENTS-011 asserts every header on html and svg), then add to `router.py`:
   ```python
   POLICY = "sandbox allow-scripts; connect-src 'none'; form-action 'none'; frame-src 'none'"

   @router.get("/requirements/changes", response_model=ChangeList)
   def get_changes(project: str | None = None) -> ChangeList:
       cwd = project_dir(project)
       folders = list_changes(cwd)
       try:
           trace = traces.get(str(project), lambda: load_trace(run, cwd))
       except RequirementsError as exc:
           return build_changes(folders, None, str(exc), exc.cause)
       return build_changes(folders, trace, None, None)

   @router.get("/requirements/changes/{project}/{change}", response_model=ChangeContent)
   def get_change(project: str, change: str) -> ChangeContent:
       found = read_change(project_dir(project), change)
       if found is None:
           raise HTTPException(status_code=404)
       return found

   @router.get("/requirements/mockups", response_model=MockupList)
   def get_mockups(project: str | None = None) -> MockupList:
       return MockupList(mockups=list_mockups(project_dir(project)))

   @router.get("/requirements/mockups/{project}/files/{capability}/{day}/{path:path}")
   def get_mockup_file(project: str, capability: str, day: str, path: str) -> FileResponse:
       found = mockup_file(project_dir(project), capability, day, path)
       if found is None:
           raise HTTPException(status_code=404)
       return FileResponse(
           found[0],
           media_type=found[1],
           headers={"Content-Security-Policy": POLICY, "X-Content-Type-Options": "nosniff"},
       )
   ```
   `POLICY` goes at module level; the endpoints inside `build_router`.
6. Run the backend checks of Track 1 step 7; expect pass. Update the README and ADR status. Commit `feat(requirements): change folders and isolated mockups API (gin-console-rm-requirements)`.

### Track 3: Frontend data, matrix and details
- **Dependencies**: none
- **Requirements**: REQ-REQUIREMENTS-013, REQ-REQUIREMENTS-014, REQ-REQUIREMENTS-015, REQ-REQUIREMENTS-019
- **Files**:
  - Create `frontend/src/features/requirements/api.ts`
  - Create `frontend/src/features/requirements/useFetched.ts`
  - Create `frontend/src/features/requirements/filters.ts`
  - Create `frontend/src/features/requirements/labels.ts`
  - Create `frontend/src/features/requirements/paths.ts`
  - Create `frontend/src/features/requirements/RequirementsError.tsx`
  - Create `frontend/src/features/requirements/MatrixSection.tsx`
  - Create `frontend/src/features/requirements/MatrixTable.tsx`
  - Create `frontend/src/features/requirements/RequirementDetails.tsx`
  - Create `frontend/src/features/requirements/fixtures.ts`
  - Test `frontend/src/features/requirements/api.test.ts`
  - Test `frontend/src/features/requirements/filters.test.ts`
  - Test `frontend/src/features/requirements/MatrixSection.test.tsx`
- **Interfaces**: consumes the JSON of `RequirementList`, `RequirementScenarios`, `ChangeList`, `ChangeContent`, `MockupList` (Tracks 1 and 2, as written above); produces the types and fetchers of `api.ts`, `Fetched<T>`, `useFetched`, `sectionHref`, `changeHref`, `mockupFileHref`, `signoffText`, `RequirementsError`, `<MatrixSection project list />` with `list: Fetched<RequirementList>`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded feature folder with the contract and rules given; no shared file.
- **Acceptance criteria**: every scenario of the Requirements has a passing test; typecheck and lint pass.
- **Estimated complexity**: medium

Steps:

1. Write `paths.ts` (no test of its own; covered by the sections):
   ```ts
   export type Section = "matrix" | "changes" | "mockups";
   const enc = encodeURIComponent;
   export const sectionHref = (section: Section, project: string, extra: Readonly<Record<string, string>> = {}): string =>
     `/requirements/${section}?${new URLSearchParams({ project, ...extra }).toString()}`;
   export const changeHref = (project: string, folder: string): string => `/requirements/changes/${enc(folder)}?project=${enc(project)}`;
   export const mockupFileHref = (project: string, capability: string, date: string, path: string): string =>
     `/api/requirements/mockups/${enc(project)}/files/${enc(capability)}/${enc(date)}/${path.split("/").map(enc).join("/")}`;
   ```
2. Write `api.test.ts`: each fetcher returns a valid body, rejects a malformed one with "unexpected response", and on 502 throws `RequirementsFailure` with the `error` text and `cause`. Expect failure, then `api.ts`:
   ```ts
   import { field, isFiniteNumber, isString, isStringOrNull } from "@/lib/guards";

   export type Cause = "outdated" | "schema";
   export type Status = "failing" | "building" | "unknown" | "covered" | "untested";
   export type SignoffState = "none" | "waived" | "current" | "changed" | "unknown version";
   export type Signoff = { state: SignoffState; actor: string | null; at: string | null; change: string | null; evidence: string | null; source: string | null };
   export type BeadRef = { id: string; title: string; status: string };
   export type CaseRef = { id: string; effective_result: string };
   export type ChangeRef = { folder: string; change: string; epic: string | null; op: string; archived: string | null };
   export type Requirement = {
     id: string; title: string; capability: string; state: "living" | "proposed" | "removed";
     status: Status | null; reasons: string[]; signoff: Signoff; changes: ChangeRef[];
     beads: BeadRef[] | null; cases: CaseRef[] | null; tests: string[];
   };
   export type RequirementList = { layout: string; requirements: Requirement[]; warnings: string[]; skipped: string[] };
   export type Scenario = { title: string; given: string[]; when: string[]; then: string[] };
   export type Scenarios = { id: string; title: string; source: string | null; scenarios: Scenario[] };
   export type ChangeFolder = { folder: string; change: string; title: string; epic: string | null; archived: string | null };
   export type ChangeRow = ChangeFolder & { signoff: Signoff | null; added: number | null; modified: number | null; removed: number | null };
   export type ChangeList = { changes: ChangeRow[]; error: string | null; cause: Cause | null };
   export type ChangeContent = ChangeFolder & { files: Record<string, string> };
   export type Mockup = { capability: string; date: string; confirmed: string; confirmed_by: string | null; description: string; html: string[]; images: string[]; requirements: string[] };
   export type MockupList = { mockups: Mockup[] };

   export class RequirementsFailure extends Error {
     readonly kind: Cause | null;
     readonly status: number;
     constructor(message: string, status: number, kind: Cause | null = null) {
       super(message);
       this.status = status;
       this.kind = kind;
     }
   }

   const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
   const every = (value: unknown, check: (item: unknown) => boolean) => Array.isArray(value) && value.every(check);
   const oneOf = (value: unknown, allowed: readonly string[]) => typeof value === "string" && allowed.includes(value);
   const isNumberOrNull = (value: unknown) => value === null || isFiniteNumber(value);
   const has = (value: object, keys: readonly string[], check: (item: unknown) => boolean) => keys.every((key) => check(field(value, key)));
   const CAUSES = ["outdated", "schema"];
   const isSignoff = (value: unknown) =>
     isObject(value) && oneOf(field(value, "state"), ["none", "waived", "current", "changed", "unknown version"]) && has(value, ["actor", "at", "change", "evidence", "source"], isStringOrNull);
   const isBead = (value: unknown) => isObject(value) && has(value, ["id", "title", "status"], isString);
   const isCase = (value: unknown) => isObject(value) && has(value, ["id", "effective_result"], isString);
   const isChangeRef = (value: unknown) => isObject(value) && has(value, ["folder", "change", "op"], isString) && has(value, ["epic", "archived"], isStringOrNull);
   const isRequirement = (value: unknown) =>
     isObject(value) &&
     has(value, ["id", "title", "capability"], isString) &&
     oneOf(field(value, "state"), ["living", "proposed", "removed"]) &&
     (field(value, "status") === null || oneOf(field(value, "status"), ["failing", "building", "unknown", "covered", "untested"])) &&
     has(value, ["reasons", "tests"], (item) => every(item, isString)) &&
     isSignoff(field(value, "signoff")) &&
     every(field(value, "changes"), isChangeRef) &&
     (field(value, "beads") === null || every(field(value, "beads"), isBead)) &&
     (field(value, "cases") === null || every(field(value, "cases"), isCase));
   const isList = (value: unknown): value is RequirementList =>
     isObject(value) && isString(field(value, "layout")) && every(field(value, "requirements"), isRequirement) && has(value, ["warnings", "skipped"], (item) => every(item, isString));
   const isScenario = (value: unknown) => isObject(value) && isString(field(value, "title")) && has(value, ["given", "when", "then"], (item) => every(item, isString));
   const isScenarios = (value: unknown): value is Scenarios =>
     isObject(value) && has(value, ["id", "title"], isString) && isStringOrNull(field(value, "source")) && every(field(value, "scenarios"), isScenario);
   const isFolder = (value: unknown): value is object => isObject(value) && has(value, ["folder", "change", "title"], isString) && has(value, ["epic", "archived"], isStringOrNull);
   const isChangeRow = (value: unknown) =>
     isFolder(value) && (field(value, "signoff") === null || isSignoff(field(value, "signoff"))) && has(value, ["added", "modified", "removed"], isNumberOrNull);
   const isChanges = (value: unknown): value is ChangeList =>
     isObject(value) && every(field(value, "changes"), isChangeRow) && isStringOrNull(field(value, "error")) && (field(value, "cause") === null || oneOf(field(value, "cause"), CAUSES));
   const isContent = (value: unknown): value is ChangeContent => {
     if (!isFolder(value)) return false;
     const files = field(value, "files");
     return isObject(files) && Object.values(files).every(isString);
   };
   const isMockup = (value: unknown) =>
     isObject(value) && has(value, ["capability", "date", "confirmed", "description"], isString) && isStringOrNull(field(value, "confirmed_by")) && has(value, ["html", "images", "requirements"], (item) => every(item, isString));
   const isMockups = (value: unknown): value is MockupList => isObject(value) && every(field(value, "mockups"), isMockup);

   async function get<T>(path: string, check: (value: unknown) => value is T): Promise<T> {
     const response = await fetch(path);
     const body: unknown = await response.json().catch(() => null);
     if (!response.ok) {
       const error = isObject(body) ? field(body, "error") : null;
       const cause = isObject(body) ? field(body, "cause") : null;
       throw new RequirementsFailure(
         typeof error === "string" ? error : `The server answered ${response.status}`,
         response.status,
         cause === "outdated" || cause === "schema" ? cause : null,
       );
     }
     if (!check(body)) throw new RequirementsFailure("unexpected response", response.status);
     return body;
   }

   const enc = encodeURIComponent;
   export const fetchRequirements = (project: string) => get(`/api/requirements?project=${enc(project)}`, isList);
   export const fetchScenarios = (project: string, id: string) => get(`/api/requirements/reqs/${enc(project)}/${enc(id)}`, isScenarios);
   export const fetchChanges = (project: string) => get(`/api/requirements/changes?project=${enc(project)}`, isChanges);
   export const fetchChange = (project: string, folder: string) => get(`/api/requirements/changes/${enc(project)}/${enc(folder)}`, isContent);
   export const fetchMockups = (project: string) => get(`/api/requirements/mockups?project=${enc(project)}`, isMockups);
   ```
3. `useFetched.ts`: one load per fetcher, the latest wins:
   ```ts
   import { useCallback, useEffect, useState } from "react";
   import { RequirementsFailure } from "./api";

   export type Fetched<T> = { status: "loading" } | { status: "error"; error: RequirementsFailure } | { status: "ok"; data: T };
   const asFailure = (error: unknown) => (error instanceof RequirementsFailure ? error : new RequirementsFailure(error instanceof Error ? error.message : String(error), 0));

   /** Load once per `fetcher` (memoised by the caller); an answer of an older fetcher is dropped. */
   export function useFetched<T>(fetcher: () => Promise<T>): { state: Fetched<T>; retry: () => void } {
     const [held, setHeld] = useState<{ of: () => Promise<T>; state: Fetched<T> } | null>(null);
     const [attempt, setAttempt] = useState(0);
     useEffect(() => {
       let live = true;
       void fetcher().then(
         (data) => live && setHeld({ of: fetcher, state: { status: "ok", data } }),
         (error: unknown) => live && setHeld({ of: fetcher, state: { status: "error", error: asFailure(error) } }),
       );
       return () => {
         live = false;
       };
     }, [fetcher, attempt]);
     const retry = useCallback(() => {
       setHeld(null);
       setAttempt((n) => n + 1);
     }, []);
     return { state: held !== null && held.of === fetcher ? held.state : { status: "loading" }, retry };
   }
   ```
4. `filters.test.ts` first (parse ignores unknown values, round trip, AND of the filters, text on id and title ignoring case, removed hidden by default, both REQ-REQUIREMENTS-014 scenarios), then `filters.ts`:
   ```ts
   import type { Requirement, SignoffState, Status } from "./api";

   export const STATUSES: readonly Status[] = ["failing", "untested", "unknown", "building", "covered"];
   export const SIGNOFFS: readonly SignoffState[] = ["current", "changed", "unknown version", "waived", "none"];
   export type MatrixFilters = { status: Status | null; capability: string | null; signoff: SignoffState | null; q: string; removed: boolean };

   export function parseFilters(search: string): MatrixFilters {
     const params = new URLSearchParams(search);
     return {
       status: STATUSES.find((s) => s === params.get("status")) ?? null,
       capability: params.get("capability") || null,
       signoff: SIGNOFFS.find((s) => s === params.get("signoff")) ?? null,
       q: params.get("q") ?? "",
       removed: params.get("removed") === "1",
     };
   }

   /** The query with the filters replaced; `project` and `req` stay. */
   export function withFilters(search: string, filters: MatrixFilters): string {
     const params = new URLSearchParams(search);
     const values: Record<string, string | null> = {
       status: filters.status, capability: filters.capability, signoff: filters.signoff,
       q: filters.q === "" ? null : filters.q, removed: filters.removed ? "1" : null,
     };
     for (const [key, value] of Object.entries(values)) {
       if (value === null) params.delete(key);
       else params.set(key, value);
     }
     return `?${params.toString()}`;
   }

   export function matching(rows: readonly Requirement[], filters: MatrixFilters): Requirement[] {
     const text = filters.q.trim().toLowerCase();
     const known = filters.capability === null || rows.some((r) => r.capability === filters.capability);
     return rows.filter(
       (r) =>
         (filters.removed || r.state !== "removed") &&
         (filters.status === null || r.status === filters.status) &&
         (!known || filters.capability === null || r.capability === filters.capability) &&
         (filters.signoff === null || r.signoff.state === filters.signoff) &&
         (text === "" || r.id.toLowerCase().includes(text) || r.title.toLowerCase().includes(text)),
     );
   }
   ```
   `labels.ts`:
   ```ts
   import { formatDateTime } from "@/lib/dates";
   import type { Signoff, SignoffState, Status } from "./api";

   export const STATUS_LABELS: Record<Status, string> = { failing: "Failing", untested: "Untested", unknown: "Unknown", building: "Building", covered: "Covered" };
   export const SIGNOFF_LABELS: Record<SignoffState, string> = { current: "Current", changed: "Changed", "unknown version": "Unknown version", waived: "Waived", none: "None" };

   /** Who and when, for a change; `null` means the trace does not know the change. */
   export function signoffText(signoff: Signoff | null, today: string): string {
     if (signoff === null) return "Unknown";
     if (signoff.state === "none") return "None";
     if (signoff.state === "waived") return "Waived";
     const at = signoff.at === null ? "" : `, ${formatDateTime(signoff.at, today)}`;
     return `${signoff.actor ?? "Unknown person"}${at}`;
   }
   ```
5. `RequirementsError.tsx` copies the structure of `features/milestones/MilestoneError.tsx:27-44` with: `outdated` → title "Requirements need a newer gin", body "Run the gin installer, then reload this page.", command `gin-workflow/install.sh`; `schema` → the message and "This console reads schema 1. Update gin-console to read it."; else "Requirements couldn't be loaded" and the message. It imports `CopyCommand` from milestones.
6. `MatrixSection.test.tsx` first: fixtures in `fixtures.ts` (`requirement(fields)` and `listOf(...rows)` builders), `vi.stubGlobal("fetch", …)`, one test per scenario of REQ-REQUIREMENTS-013, 014, 015, 019. Then:
   - `MatrixSection({ project, list, retry })`: reads `search` from `useLocation()`; loading text; `RequirementsError` on failure; `layout === "legacy"` → "This project uses the legacy layout, which has no requirement ids."; no rows → "This project has no requirements yet."; otherwise the warnings in an `Alert` with `role="status"`, the status buttons (`aria-pressed`, label `Covered 105`, counted over rows that are not removed), one wrapping line of labelled selects and a search input, the "Show removed" checkbox, then `MatrixTable`, or "No requirements match" with a "Clear filters" button. Filter changes call `navigate("/requirements/matrix" + withFilters(search, next), { replace: true })`.
   - `MatrixTable({ project, rows, selected, search })`: one `<table>` per capability under an `<h2>`, from `components/ui/table.tsx` in an `overflow-x-auto` box; the id cell holds a `Link` to the same query with `req=<id>`; cells: title, `STATUS_LABELS` (or "Removed") plus `reasons.join(", ")`, `SIGNOFF_LABELS`, beads `closed/total` or "unknown", cases `passed/total` or "unknown".
   - `RequirementDetails({ project, id, row, onClose })`: an `<aside aria-label={id}>`; `useFetched(useCallback(() => fetchScenarios(project, id), [project, id]))`; when `row` is undefined it says "Requirement <id> was not found"; scenarios as a list of Given, When, Then; on error "Scenarios could not be loaded" and the rest stays; beads link to `/beads/<project>/<id>` with `StateGlyph`; changes link through `changeHref`; the waived sign-off shows `evidence` as its reason.
7. Run `pnpm -C frontend test --run src/features/requirements && pnpm -C frontend typecheck && pnpm -C frontend lint`; expect pass. Commit `feat(requirements): matrix and details (gin-console-rm-requirements)`.

### Track 4: Frontend changes and mockups
- **Dependencies**: Track 3
- **Requirements**: REQ-REQUIREMENTS-011, REQ-REQUIREMENTS-016, REQ-REQUIREMENTS-017, REQ-REQUIREMENTS-018, REQ-REQUIREMENTS-019
- **Files**:
  - Create `frontend/src/features/requirements/ChangesSection.tsx`
  - Create `frontend/src/features/requirements/ChangePage.tsx`
  - Create `frontend/src/features/requirements/MockupsSection.tsx`
  - Create `frontend/src/features/requirements/MockupFrame.tsx`
  - Test `frontend/src/features/requirements/ChangesSection.test.tsx`
  - Test `frontend/src/features/requirements/ChangePage.test.tsx`
  - Test `frontend/src/features/requirements/MockupsSection.test.tsx`
- **Interfaces**: consumes Track 3; produces `<ChangesSection project list retry />`, `<ChangePage project folder row />` (`row: ChangeRow | null` supplies the sign-off), `<MockupsSection project list retry />`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** three small views over typed data; the isolation rule is one attribute with a test.
- **Acceptance criteria**: every scenario of the Requirements has a passing test; the iframe `sandbox` is exactly `allow-scripts`.
- **Estimated complexity**: medium

Steps:

1. `MockupsSection.test.tsx`: lists folders by capability; `mockup=ui/2026-11-22` shows the description and the frame; images only shows no frame; empty text "This project has no confirmed mockups yet."; and
   ```tsx
   // REQ-REQUIREMENTS-011
   it("isolates a mockup", () => {
     render(<MockupFrame title="ui 2026-11-22" src="/api/requirements/mockups/a/files/ui/2026-11-22/index.html" />);
     expect(screen.getByTitle("ui 2026-11-22")).toHaveAttribute("sandbox", "allow-scripts");
   });
   ```
   Then write `MockupFrame.tsx`:
   ```tsx
   /** REQ-REQUIREMENTS-011: the only place a mockup is shown. No allow-same-origin: its scripts must not reach the console. */
   export function MockupFrame({ title, src }: { title: string; src: string }) {
     return <iframe title={title} src={src} sandbox="allow-scripts" referrerPolicy="no-referrer" className="h-[70vh] w-full rounded border bg-white" />;
   }
   ```
   and `MockupsSection`: the folder links go to `sectionHref("mockups", project, { mockup: "<capability>/<date>" })`; requirement ids link to `sectionHref("matrix", project, { req: id })`; the HTML files are buttons (`aria-pressed`, the first one shown), each with a link "Open in a new tab" (`target="_blank" rel="noreferrer"`); images are `<img>` with the file name as `alt`; the description uses `MarkdownView`.
2. `ChangesSection.test.tsx` (signed off, trace failed, empty text "This project has no changes yet."), then `ChangesSection`: two lists "Open" and "Archived"; each row has the title as `Link` to `changeHref`, the epic as `Link` to `/beads/<project>/<epic>`, `signoffText`, and "3 added, 1 modified, 0 removed" or "Counts unknown"; `list.error` shows in an `Alert` above.
3. `ChangePage.test.tsx` (missing plan has no tab, `<script>` in Markdown renders as text, 404 shows "Change <folder> was not found" with a link to the Changes section), then `ChangePage`: `useFetched(fetchChange)`; tabs in the order proposal "Proposal", spec-delta "Spec delta", design "Design", plan "Plan", tests "Tests" for the keys in `files`, as links with `tab=<key>` and `aria-current`; an unknown `tab` shows the first; text through `MarkdownView`.
4. Run the checks of Track 3 step 7; expect pass. Commit `feat(requirements): changes and mockups (gin-console-rm-requirements)`.

### Track 5: Page, navigation and way back
- **Dependencies**: Track 4
- **Requirements**: REQ-REQUIREMENTS-012, REQ-UI-055, REQ-UI-057, REQ-UI-063, REQ-UI-072, REQ-UI-073, REQ-UI-123, REQ-UI-124, REQ-UI-126
- **Files**:
  - Create `frontend/src/features/requirements/RequirementsPage.tsx`
  - Create `frontend/src/features/requirements/sectionStore.ts`
  - Modify `frontend/src/app/App.tsx:15-92` (lazy route)
  - Modify `frontend/src/app/Layout.tsx:26-35` (NAV), `frontend/src/app/Layout.tsx:162-200` (short label, sub-items)
  - Modify `frontend/src/app/project.ts:69-92` (`projectHref`, `switchProject`)
  - Modify `frontend/src/app/origin.ts:4` (kind `requirements`)
  - Modify `frontend/src/features/beads/Breadcrumb.tsx:33-52` (case `requirements`)
  - Test `frontend/src/features/requirements/RequirementsPage.test.tsx`
  - Test `frontend/src/app/Layout.test.tsx`
  - Test `frontend/src/app/App.test.tsx`
  - Test `frontend/src/app/project.test.ts`
  - Test `frontend/src/features/beads/Breadcrumb.test.tsx`
- **Interfaces**: consumes Tracks 3 and 4; produces the routes `/requirements`, `/requirements/<section>`, `/requirements/changes/<folder>`.
- **Provider role**: `frontend`
- **Model:** `opus`
- **Effort:** `high`
- **Why:** cross-module change of the shell every page uses.
- **Acceptance criteria**: every scenario of the Requirements has a passing test; existing shell tests change only for the sixth link.
- **Estimated complexity**: medium

Steps:

1. `project.test.ts`: add REQ-UI-123 "Choose on a change page" and a section case (`/requirements/matrix?project=a&status=failing&q=x` → `/requirements/matrix?project=b&q=x`). Expect failure, then in `projectHref` add `"/requirements"` to the union and in `switchProject`, before the `/beads/` line:
   ```ts
   if (pathname.startsWith("/requirements/changes/")) return `/requirements/changes?${new URLSearchParams({ project: name }).toString()}`;
   if (pathname === "/requirements" || pathname.startsWith("/requirements/")) {
     const q = new URLSearchParams(search).get("q");
     return withQuery(pathname, new URLSearchParams(q === null ? { project: name } : { project: name, q }));
   }
   ```
2. Origin and breadcrumb: tests for REQ-UI-072 and 073, then add `"requirements"` to `KINDS` and in `firstLink`:
   ```ts
   case "requirements":
     return { to: origin.path + origin.search, label: "Requirements" };
   ```
3. `sectionStore.ts`: the store of `features/reports/sectionStore.ts` with `type SectionLink = { section: Section; label: string; count: number | null; href: string }`, exporting `publishSections`, `clearSections`, `useRequirementSections`.
4. `Layout.test.tsx`: six links, short label, current on every path under `/requirements`, bead from Requirements, the sub-items at wide. Then `NAV`: insert between Milestones and Reports, with `short: "REQs"` on this entry and `short: null` on the others:
   ```ts
   { to: (project: string) => projectHref("/requirements", project), label: "Requirements", short: "REQs", icon: FileCheck, current: ({ path, from }: Place) => isRequirements(path) || from === "requirements" },
   ```
   with `const isRequirements = (path: string) => path === "/requirements" || path.startsWith("/requirements/");`. The label renders as
   ```tsx
   {short === null ? label : <><span className={cn(wide && "lg:hidden")}>{short}<span className="sr-only">{` (${label})`}</span></span>{wide && <span className="hidden lg:inline">{label}</span>}</>}
   ```
   so the accessible name is "REQs (Requirements)" where the short label shows, and "Requirements" in the wide sidebar. Because jsdom has no CSS, `Layout.test.tsx` and other tests that name the links find this one by `href`; the accessible name per width is checked in the e2e spec of Track 6. The list "Requirement sections" repeats the markup of the Report sections list with the count as its headline, for `isRequirements(pathname) && wide`.
5. `RequirementsPage.test.tsx`: redirect replaces the URL, unknown section shows the not-found page, unknown project notice, titles, and the row of section links. Then `RequirementsPage`:
   - route: `/requirements` → `navigate("/requirements/matrix" + search, { replace: true })`; `matrix`, `changes`, `mockups`; `/requirements/changes/<folder>` with the folder decoded in try/catch; anything else → `NotFoundPage`.
   - project: the pattern of `MilestonesPage.tsx:35-60` (`useConfiguredProjects` instead of its own fetch), keeping the path and the other query keys when `project` is written into the URL; `UnknownProject` with `hrefOf={(name) => `${pathname}?project=${encodeURIComponent(name)}`}`.
   - data: three `useFetched` (list, changes, mockups) with memoised fetchers, so the sidebar counts fill in; counts: requirements that are not removed and not `covered`; changes with `archived === null`; mockups; `null` while not loaded.
   - `publishSections` in an effect, `clearSections` on unmount; `rememberOrigin("requirements", pathname, search, project)`; `usePageTitle("Requirements · <Section>", project)` or `usePageTitle(folder, project)`; `useRestoreOnBack(list.state.status === "ok")` on the matrix.
   - the row of section links is hidden in the wide expanded shell with the class the Reports page uses: copy it from `features/reports/ReportsView.tsx` where `SectionLinks` is rendered inside `TabStrip`.
   In `App.tsx`: `const RequirementsPage = lazy(() => import("@/features/requirements/RequirementsPage").then((m) => ({ default: m.RequirementsPage })));` and the branch `pathname === "/requirements" || pathname.startsWith("/requirements/")` in a `Suspense` before the Reports branch.
6. Run `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`; expect pass. Commit `feat(requirements): page, navigation and way back (gin-console-rm-requirements)`.

### Track 6: QA cases and e2e
- **Dependencies**: Track 2, Track 5
- **Requirements**: REQ-REQUIREMENTS-011, REQ-REQUIREMENTS-012, REQ-REQUIREMENTS-013, REQ-REQUIREMENTS-014, REQ-REQUIREMENTS-015, REQ-REQUIREMENTS-016, REQ-REQUIREMENTS-017, REQ-REQUIREMENTS-018, REQ-REQUIREMENTS-019, REQ-UI-055, REQ-UI-072, REQ-UI-123
- **Files**:
  - Create `qa/cases/requirements/` (api and e2e cases for the REQs, `TC-REQUIREMENTS-NNN`)
  - Create `qa/e2e/requirements/` (one spec per e2e case)
  - Create `qa/e2e/support/requirements.ts` (stubs of `/api/requirements*`)
  - Modify `qa/cases/ui/TC-UI-249-four-links.e2e.md`
  - Modify `qa/e2e/ui/tc-ui-249.spec.ts`
  - Modify `qa/e2e/support/shell.ts`
- **Interfaces**: consumes the shipped page and endpoints.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** follows the existing gin-qa case and spec style; no product code.
- **Acceptance criteria**: `gin-qa cases check` prints `ok`, the specs pass, and the cases of the changed REQs cite the new hashes.
- **Estimated complexity**: medium

Steps:

1. Read the `gin-console-qa` skill and `qa/guidelines.md`; write the cases with `gin-qa:cases --change gin-console-rm-requirements`, and update the cases that cite a MODIFIED REQ. Run `gin-qa cases check`; expect `ok`.
2. Build the frontend (`pnpm -C frontend build`), write the specs with `gin-qa:e2e requirements`, and run them with `--trace off`; expect pass. The REQ-REQUIREMENTS-011 spec opens a real mockup file response whose script calls `fetch("/api/projects/beads")` and `fetch("/api/refresh", { method: "POST", mode: "no-cors" })`, both in the frame and in its own tab, and asserts that neither request reaches the server. A spec at 390px and at 820px reads the accessible name "REQs (Requirements)" and checks that no label is cut off; one at 1440px reads "Requirements".
3. Run the `gin-qa:tests` flow for the api cases; expect pass.
4. Run `gin specs trace --change gin-console-rm-requirements`; expect no missing REQ.
5. Commit `test(requirements): QA cases and e2e specs (gin-console-rm-requirements)`.

### Track 7: TC-1 on the Tailscale build
- **Dependencies**: Track 6
- **Requirements**: REQ-REQUIREMENTS-011, REQ-REQUIREMENTS-013, REQ-REQUIREMENTS-015, REQ-REQUIREMENTS-017, REQ-REQUIREMENTS-018, REQ-REQUIREMENTS-019
- **Files**:
  - Modify `docs/changes/gin-console-rm-requirements-requirements/05-tests.md` (TC-1 evidence)
- **Interfaces**: consumes the deployed console.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a scripted check of the deployed console; no product code.
- **Human gate**: restarting the deployed Tailscale service needs the user's go-ahead
- **Acceptance criteria**: TC-1 is recorded with its result and evidence.
- **Estimated complexity**: low

Steps:

1. After the go-ahead, build the frontend and restart the service (`systemctl --user restart gin-console`).
2. With Playwright on the Tailscale build, compare the matrix counts with `gin specs trace --all --format json`, open a requirement, a change and a mockup, and check that the mockup cannot call the API, qwikfone shows its warning and gin-workflow its empty state.
3. Record the result in `05-tests.md` and commit `test(requirements): TC-1 (gin-console-rm-requirements)`.

## Integration
- **Branch**: `feat/rm-requirements`
- **Merge strategy**: parallel-then-merge

## Validation
- [ ] `uv run --directory backend pytest && uv run --directory backend ruff check . && uv run --directory backend mypy`
- [ ] `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`
- [ ] `gin specs lint --change gin-console-rm-requirements --against master` and `gin specs trace --change gin-console-rm-requirements`
- [ ] `gin-qa cases check`
- [ ] TC-1 on the Tailscale build

## Notes
- A `[gin ship]` comment of 2026-11-21 is the only epic comment; the spec counted it.
- Track beads close after tests and review; the epic stays open until the human-confirmed merge.
