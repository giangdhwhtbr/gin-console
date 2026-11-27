# Plan: Test coverage and release readiness

Epic: gin-console-rm-test-coverage
Spec: `01-proposal.md`, `02-spec-delta.md`, and `03-design.md` in this folder. Decision: `docs/adr/0007-console-reads-qa-results.md`. Diagrams: `docs/specs/qa/diagrams/case-run-activity.md`, `docs/specs/qa/diagrams/readiness-activity.md`, `docs/specs/qa/diagrams/readiness-state.md`. Use cases: `docs/specs/qa/use-cases/review-test-results.md`, `docs/specs/qa/use-cases/check-release-readiness.md`.

## Objective

QA and the lead see whether a milestone can ship:
- **Backend (new context `qa`):** the cases of a project from `gin-qa cases export`, counted by capability, type and effective result; one case with its bug and its latest e2e run; the screenshot of a run step; and the readiness checklist of a milestone, all read-only.
- **Frontend:** a Tests page and a case page reached from a new Tests link in the main navigation, and a Readiness tab on the milestone page.

Done when:
- Every scenario of the 13 added REQs (`REQ-QA-001` to `REQ-QA-013`) and the new or changed scenarios of the 3 modified REQs (`REQ-UI-055`, `REQ-UI-124`, `REQ-MILESTONE-UI-018`) have a test naming the REQ-ID.
- `uv --directory backend run pytest`, `ruff check .`, and `mypy` pass.
- `pnpm -C frontend test --run`, `typecheck`, `lint`, and `build` pass.
- `gin specs lint --change gin-console-rm-test-coverage --against master` prints `ok`, `gin specs trace --change gin-console-rm-test-coverage` reports no missing REQ, and `gin-qa cases check --change gin-console-rm-test-coverage` prints `ok`.

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
  - The traceability matrix (`backend/src/gin_console/requirements/`) knows a case only as `CaseRef(id, effective_result)` (`requirements/models.py:35-37`), taken from `gin specs trace --all`; no page lists cases, their type, priority, bug or run.
  - No endpoint reads `qa/evidence/<run>/<tc-id>/result.json` or serves a step screenshot; ADR 0004 allows only `docs/changes` and the spec asset folders.
  - Whether a milestone can ship needs four lookups by hand: the milestone's epics (`gin milestone show`), their requirements (the trace's `changes[].epic`), the open P0/P1 bugs (the Beads export, `reports/bugs.py:35-44` `source_epic`) and the gates of each epic (`gin state --workflow-id`, `projects/collect.py:153-169`).
- **Success criteria:** the REQs above, with the tests and checks of the Objective.
- **Global constraints** (from the spec and the user decisions of 2026-11-27):
  - **Read-only:** nothing is written to projects, Beads, `qa/` or the evidence folders. The console runs `gin-qa cases export --format json` and never reads `qa/cases` itself; it never works out `outdated` or any result again (`effective_result` is gin-qa's).
  - **Effective results:** `passed`, `failed`, `blocked`, `not run`, `outdated`; any other value is kept as written and counted under `other`.
  - **gin-qa source:** run in the project's directory, at most 30 seconds, kept 60 seconds per project, one run per project at a time, failures not kept, forgotten on `POST /api/refresh`; 502 with `error` and `cause`: `missing` (no `gin-qa`), `outdated` (no `cases` list, or a case without `effective_result`), else `null`. Keys the console does not use are ignored.
  - **Project access:** 404 for a project that is not configured, whose directory is missing, or that REQ-AUTH-007 hides, checked before any cache.
  - **Latest run:** the folder the case's `run` names; read `<run>/<id lower>/result.json` only when `run` is relative with no `..` part, no `\`, no NUL, no `:`, and the folder resolves inside the project's `path`; at most 1 MB; reasons `no_run`, `not_on_host`, `invalid`. A step screenshot is a plain file name (`[A-Za-z0-9._-]+`, no `/`) naming, in that folder, an image available as REQ-BEADS-027 says for a file inside the project (not `evidence_roots`).
  - **Screenshot route:** `GET /api/qa/cases/{project}/{id}/run/steps/{n}/screenshot`, re-checked on every request; headers `Content-Type` from the first bytes, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'`, `Content-Disposition: inline`, `Cache-Control: private, no-cache`; one 404 body `{"error":"not found"}` for every failure; the browser never sends a path.
  - **Readiness scope:** the epics `gin milestone show <milestone> --json` lists, closed or not; the requirements of `gin specs trace --all` whose `state` is not `removed` with a change of `op` `added` or `modified` whose `epic` is one of them, archived or not; the cases whose `reqs` name one of those requirements.
  - **Readiness items** (user decisions): `cases` "Every requirement has a case"; `results` "Every case passed since its requirement changed", passing only when every case is `passed` (not run, outdated, failed and blocked all fail it); `bugs` "No open P0 or P1 bug", over open bugs (REQ-REPORTS-039) with `priority` 0 or 1 whose source epic (REQ-REPORTS-040) is one of the milestone's epics or that have none, bugs of another milestone's epics left out; `gates` "Every epic shipped", all five gates of every epic `satisfied` or starting with `waived`. `unknown` when a source fails, never `pass`. Verdict `ready`, `not_ready` or `unknown`.
  - **Gates:** `gin state` for at most four epics at a time, kept 60 seconds per (project, epic), forgotten on refresh.
  - **Pages** (user decision): a Tests link between Requirements and Reports in the "Main" navigation, a Tests page at `/tests?project=<name>`, a case page at `/tests/<project>/<id>`, and a Readiness tab (`tab=readiness`) on the milestone page.
  - **Platforms:** Linux, macOS and native Windows keep working; `gin-qa` runs through its `.cmd` shim or Git Bash on Windows as `gin` does; path checks use `pathlib`.
- **Non-goals:** running tests or recording results; the run history and trends (`gin-qa runs export`, gin-console-rm-test-trends); reading `qa/cases` directly; installing gin-qa in the Docker image.

## Approach Options
### Option 1: The backend assembles each answer, one endpoint per view
- **Summary:** a new `qa` context reads `gin-qa cases export` (cached), the latest run files, and, for readiness, the milestone, the trace, the Beads export and `gin state` per epic, and returns finished answers; the frontend renders them.
- **Pros:** every rule (scope, items, verdict, path safety) lives in pure Python functions tested with fakes; one request per view; the four items come from one consistent read.
- **Cons:** the `qa` context reads functions of `requirements`, `milestones`, `reports`, `beads` and `projects`.

### Option 2: The frontend assembles readiness from existing endpoints
- **Summary:** only the case endpoints are added; the Readiness tab calls the milestone detail, `/api/requirements`, `/api/reports/bugs` and `/api/beads/<p>/<epic>/workflow` per epic and works out the items in the browser.
- **Pros:** less backend code.
- **Cons:** rejected at discuss: 3 + N requests per tab, rules in the browser, items read from caches of different ages, and no single place to test the checklist.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** the design confirmed at discuss (ADR 0007); the other contexts are only read through their public functions, so no other context changes behaviour.

## Scope
- **In scope:** `REQ-QA-001` to `REQ-QA-013`; modified `REQ-UI-055`, `REQ-UI-124` and `REQ-MILESTONE-UI-018`; the `Lightbox` props change that lets the case page reuse it (bead images unchanged); `read_image` made public in `beads/images.py`; `gin-qa` in `_resolve_cmd`; the README and AGENTS.md lines naming the Tests page and ADR 0007; the gin-qa cases and specs of these REQs.
- **Out of scope:** the non-goals above; back-links from a bead page to the Tests page (`app/origin.ts` keeps its kinds).

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend qa context, cases and runs) and Track 3 (frontend Tests and case pages, nav, Lightbox) share no file, so they run at once in their own worktrees; Track 2 adds readiness to the qa context of Track 1 and waits for it; Track 4 adds the Readiness tab over the frontend qa api of Track 3 and waits for it; Track 5 waits for Tracks 2 and 4.
```

## Tasks

### Track 1: Cases, latest run and step screenshots (backend)
- **Dependencies**: none
- **Requirements**: REQ-QA-001, REQ-QA-002, REQ-QA-003, REQ-QA-004, REQ-QA-005, REQ-QA-006
- **Files**:
  - Create `backend/src/gin_console/qa/__init__.py`
  - Create `backend/src/gin_console/qa/source.py`
  - Create `backend/src/gin_console/qa/models.py`
  - Create `backend/src/gin_console/qa/runs.py`
  - Create `backend/src/gin_console/qa/service.py`
  - Create `backend/src/gin_console/qa/router.py`
  - Modify `backend/src/gin_console/app.py:30-37` (imports), `:72-84` (`run_gin_qa` parameter), `:163-172` (include the qa router)
  - Modify `backend/src/gin_console/projects/collect.py:67-81` (`_resolve_cmd` maps `gin-qa` as it maps `gin`)
  - Modify `backend/src/gin_console/beads/images.py:275-283` (public `read_image`)
  - Modify `README.md:444` (a section "Tests" after "## Requirements": gin-qa must be on the console host; screenshots show only where `qa/evidence` is)
  - Modify `AGENTS.md:29` (the read-only line also names ADR 0007: the console reads gin-qa output and run files)
  - Create `backend/tests/fake_gin_qa.py`
  - Test `backend/tests/test_qa_source.py`
  - Test `backend/tests/test_qa_api.py`
  - Test `backend/tests/test_qa_runs.py`
  - Test `backend/tests/test_qa_screenshot_api.py`
  - Test `backend/tests/test_collect.py` (the `gin-qa` shim on Windows, as the existing `gin` tests)
  - Test `backend/tests/test_bead_images.py` (`read_image`)
- **Interfaces**:
  - Consumes: `run_json`, `CollectError` (`projects/collect.py:117-131`, `:17-23`; a missing command raises `CollectError("<cmd> not found")` with `returncode None`, a timeout `CollectError("<cmd> timed out")`); `KeyedCache` (`beads/service.py:7-51`); `SnapshotStore.get` (`beads/snapshot.py:136`) and `BeadsError` (`beads/errors.py`); `ProjectsOf` (`auth/access.py:73`) and the `project_dir` pattern of `requirements/router.py:50-55`; `media_type`, `check`, `MAX_BYTES` (`beads/images.py:179-189`, `:275-278`, `:22`); `IMAGE_NOT_FOUND`, `IMAGE_HEADERS` (`beads/router.py:30-36`). Test helpers: `tests/fake_export.py` (`bead`, `write_export`), the `make` pattern of `tests/test_requirements_api.py:22-31`.
  - Produces (`beads/images.py`): `read_image(file: Path, folders: Sequence[Path]) -> tuple[bytes, str] | None` returning `_load(file, _real_folders(folders), MAX_BYTES + 1)`; behaviour of `check`, `ImageIndex` and the bead routes unchanged.
  - Produces (`projects/collect.py`): `_resolve_cmd` treats `cmd[0] in {"gin", "gin-qa"}` alike (shim from `shutil.which(cmd[0])`, else `[bash, "-c", f'{cmd[0]} "$@"', "_", *cmd[1:]]`).
  - Produces (`qa/source.py`):
    ```python
    QA_TIMEOUT = 30.0
    Cause = Literal["missing", "outdated"]

    class QaError(Exception):
        def __init__(self, message: str, cause: Cause | None = None) -> None: ...
        cause: Cause | None

    class GinQaRunner(Protocol):
        def __call__(self, args: list[str], cwd: Path) -> Any: ...

    def run_gin_qa(args: list[str], cwd: Path) -> Any:
        # run_json(["gin-qa", *args], cwd, timeout=QA_TIMEOUT); CollectError ending "not found"
        # with returncode None -> QaError("gin-qa is not installed on the console host", "missing");
        # any other CollectError -> QaError(str(exc))
    def load_cases(run: GinQaRunner, cwd: Path) -> CaseExport:
        # run(["cases", "export", "--format", "json"], cwd); not a dict with a list "cases", or a
        # case without a string "effective_result" -> QaError("this gin-qa has no effective_result", "outdated");
        # other validation errors -> QaError("gin-qa cases export output was not understood")
    ```
  - Produces (`qa/models.py`, pydantic, `extra="ignore"`):
    ```python
    class ExportReq(BaseModel): id: str
    class ExportCase(BaseModel):
        id: str; title: str; capability: str; type: str; priority: str = ""
        result: str; effective_result: str; run: str = ""; bug: str = ""; file: str
        reqs: list[ExportReq] = []
        preconditions: list[Any] = []; steps: list[Any] = []; expected: list[Any] = []
    class CaseExport(BaseModel): cases: list[ExportCase]

    class CaseRow(BaseModel):
        id: str; title: str; capability: str; type: str; priority: str
        result: str; effective_result: str; reqs: list[str]; bug: str | None; file: str
    class CaseCounts(BaseModel):
        name: str; passed: int = 0; failed: int = 0; blocked: int = 0
        not_run: int = 0; outdated: int = 0; other: int = 0; total: int = 0
    class Counts(BaseModel): by_capability: list[CaseCounts]; by_type: list[CaseCounts]
    class CaseList(BaseModel): cases: list[CaseRow]; counts: Counts
    class CaseBug(BaseModel):
        id: str; title: str | None = None; status: str | None = None; priority: int | None = None
    class RunStep(BaseModel):
        n: int; title: str; status: str; error: str | None; screenshot: bool
    class LatestRun(BaseModel):
        folder: str; status: str | None; started: str | None; finished: str | None
        error: str | None; steps: list[RunStep]
    RunReason = Literal["no_run", "not_on_host", "invalid"]
    class CaseDetail(CaseRow):
        preconditions: list[Any]; steps: list[Any]; expected: list[Any]
        bug_detail: CaseBug | None   # serialized as "bug" (Field(serialization_alias="bug")); CaseRow.bug excluded
        latest_run: LatestRun | None; latest_run_reason: RunReason | None
    class QaErrorBody(BaseModel): error: str; cause: Cause | None
    ```
    `CaseDetail` is returned with `model_dump(by_alias=True, exclude={"bug"})` so its JSON has one `bug` object as REQ-QA-004 shows.
  - Produces (`qa/runs.py`):
    - `RESULT_LIMIT = 1024 * 1024`; `_SCREENSHOT = re.compile(r"[A-Za-z0-9._-]+")`.
    - `run_folder(entry: ProjectEntry, run: str) -> Path | None | Literal["invalid"]`: `None` for an empty `run`; `"invalid"` when `run` is absolute, has a `..` or empty part, `\`, NUL or `:`, or resolves outside `entry.path.resolve()`; else the resolved folder (it may not exist).
    - `latest_run(entry: ProjectEntry, case: ExportCase) -> tuple[LatestRun | None, RunReason | None]`: reads `<folder>/<case.id.lower()>/result.json` opened once with at most `RESULT_LIMIT + 1` bytes; `not_on_host` when the folder or file does not exist, `invalid` when over the limit, not JSON, not an object or without a list `steps`; each step `n` from 1, `title`, `status`, `error` as strings or `None`, `screenshot` true when `_SCREENSHOT.fullmatch(name)` and `check(folder / id_lower / name, [entry.path])` is not `None`.
    - `read_screenshot(entry: ProjectEntry, case: ExportCase, n: int) -> tuple[bytes, str] | None`: repeats `latest_run`, takes step `n`, and returns `read_image(file, [entry.path])` only when that step's `screenshot` is true.
  - Produces (`qa/service.py`): `build_list(export: CaseExport) -> CaseList` (rows sorted by `id`; counts rows sorted by `name`; `not run` counted as `not_run`, unknown values as `other`); `case_detail(export: CaseExport, snapshot: Snapshot | None, entry: ProjectEntry, case_id: str) -> CaseDetail | None` (the bug's `title`, `status`, `priority` from `snapshot.rows[bug]` when present; `None` snapshot keeps only the id).
  - Produces (`qa/router.py`): `build_router(settings: Settings, run_gin_qa: GinQaRunner, snapshots: SnapshotStore, clock: Callable[[], datetime], on_refresh: list[Callable[[], None]], projects: ProjectsOf) -> APIRouter` with `TTL = timedelta(seconds=60)`, `exports = KeyedCache[str, CaseExport](TTL, clock)` keyed by project name and cleared through `on_refresh`; routes `GET /qa/cases` (query `project`), `GET /qa/cases/{project}/{case_id}`, `GET /qa/cases/{project}/{case_id}/run/steps/{n}/screenshot` (`n` matching `[0-9]{1,3}`; every failure, an unknown project included, answers the plain 404 of `beads/router.py:30`); `QaError` answers `JSONResponse(502, {"error": str(exc), "cause": exc.cause})`.
  - Produces (`app.py`): `create_app(..., run_gin_qa: GinQaRunner = default_run_gin_qa)` and `api.include_router(build_qa_router(settings, run_gin_qa, snapshots, clock, on_refresh, projects))` placed after the requirements router.
  - Produces (`tests/fake_gin_qa.py`): `case(ident: str = "TC-UI-001", **fields) -> dict[str, Any]` (a full export case: capability `ui`, type `e2e`, priority `medium`, result and effective_result `passed`, run and bug `""`, file `qa/cases/ui/<id>.e2e.md`, `reqs [{"id": "REQ-UI-001", "hash8": "1a2b3c4d"}]`, empty steps); `export(*cases) -> dict[str, Any]` (`{"cases": [...]}`); `class FakeGinQa` (outputs per args tuple, an exception in outputs is raised, `calls: list[tuple[list[str], Path]]`, optional `delay` for the two-readers test).
- **Provider role**: `backend`
- **Model:** `opus`
- **Effort:** `high`
- **Why:** path safety over an untrusted `run` value and untrusted `result.json` content (traversal, symlinks, FIFO, size, image bytes) plus a new cached source wired into the app and the Windows command shim: the rubric's security and cross-module row.
- **Steps**:
  1. `test_qa_source.py` first: fields kept, unknown keys ignored, `missing` (`FakeGinQa` raising through a runner that raises `CollectError("gin-qa not found")`), `outdated` (a case without `effective_result`; no `cases` key), timeout message, invalid JSON (REQ-QA-002). Run `uv --directory backend run pytest tests/test_qa_source.py`; expect import errors. Write `qa/__init__.py`, `qa/models.py`, `qa/source.py` until they pass.
  2. `test_qa_runs.py`: every scenario of REQ-QA-005 naming it, with `tmp_path` projects: a run folder with `result.json` and PNG bytes `b"\x89PNG\r\n\x1a\n" + b"0" * 100` as `01.png` and text as `02.png`; empty `run`; deleted folder; api case without `<id>/result.json`; `run` `../outside/r1`, `/abs/r1`, `qa\\evidence\\r1`, `qa/evidence:x`; screenshot names `../../secret.png`, `a/b.png`; a symlinked run folder pointing outside (skip on Windows with `pytest.mark.skipif(sys.platform == "win32", ...)`); a FIFO screenshot (skip on Windows); an 11 MB PNG; a `result.json` of 1 MB + 1 byte and one that is a JSON list. Add `read_image` tests to `test_bead_images.py`. Write `runs.py` and `read_image`.
  3. `test_qa_api.py`: every scenario of REQ-QA-001, REQ-QA-003, REQ-QA-004 and the API scenarios of REQ-QA-002 through `create_app(settings, static_dir=..., run_gin_qa=fake, clock=...)` (hidden project with auth on as in `tests/test_auth_access_api.py`, asserting `fake.calls == []`); the cache: two readers at once run the export once, refresh runs it again, a failure is not kept. Write `service.py`, `router.py`, the `app.py` wiring.
  4. `test_qa_screenshot_api.py`: both scenarios of REQ-QA-006: 200 with `image/png`, the bytes and the four headers; 404 with `{"error":"not found"}` for a text screenshot, steps 0 and 3 of a two-step run, an unknown case, an unknown project, and a file deleted after the detail was read.
  5. `test_collect.py`: `_resolve_cmd(["gin-qa", "cases"])` on a patched `sys.platform == "win32"` returns the `.cmd` shim or the bash form, mirroring the `gin` tests.
  6. README paragraph and the AGENTS.md line. Run `uv --directory backend run pytest`, `ruff check .`, `mypy`; commit.
- **Acceptance criteria**:
  - Every scenario of REQ-QA-001 to REQ-QA-006 has a test naming the REQ-ID; existing bead image, collect and requirements tests pass unchanged.
  - No test starts `gin-qa`, `gin` or `bd`.
  - `pytest`, `ruff check .`, and `mypy` pass.
- **Estimated complexity**: high

### Track 2: Readiness checklist (backend)
- **Dependencies**: Track 1
- **Requirements**: REQ-QA-007, REQ-QA-008, REQ-QA-009
- **Files**:
  - Create `backend/src/gin_console/qa/readiness.py`
  - Modify `backend/src/gin_console/qa/models.py` (readiness models)
  - Modify `backend/src/gin_console/qa/router.py` (the readiness route, the trace and gate caches)
  - Modify `backend/src/gin_console/app.py:163-172` (pass `run_gin`, `run_gw` and `run_epic_workflow` to the qa router)
  - Test `backend/tests/test_qa_readiness.py`
  - Test `backend/tests/test_qa_readiness_api.py`
- **Interfaces**:
  - Consumes: `show_milestone(run, cwd, milestone_id, None)`, `MilestonesError`, `GwRunner` (`milestones/source.py:129-137`, `:21-31`), `MilestoneDetail.epics: list[EpicPlan]` (`milestones/models.py:118-151`, fields `id`, `title`, `status`); `load_trace(run, cwd)`, `RequirementsError`, `GinRunner` (`requirements/source.py:41-50`, `:19-28`), `Trace.requirements[].state`, `.changes[].op`, `.changes[].epic` (`requirements/models.py:21-57`); `read_beads(snapshot, project, {})` (`reports/source.py:105`), `Tree` (`reports/scope.py:19`), `is_bug`, `source_epic` (`reports/bugs.py:30-44`); `collect_epic_workflow` as `Callable[[Path, str], EpicWorkflow | BlockError]` (`projects/collect.py:153-169`, `projects/models.py:7-22`); `CaseExport` and the export cache of Track 1; `valid_id` (`beads/source.py`).
  - Produces (`qa/models.py`):
    ```python
    ItemState = Literal["pass", "fail", "unknown"]
    Verdict = Literal["ready", "not_ready", "unknown"]
    class ReqEntry(BaseModel): id: str; title: str; capability: str
    class CaseEntry(BaseModel): id: str; title: str; effective_result: str; bug: str | None
    class BugEntry(BaseModel): id: str; title: str; priority: int; epic: EpicRef | None   # EpicRef from reports/models.py
    class EpicEntry(BaseModel): id: str; title: str; gate: str   # the first unmet gate, or "unknown"
    class ReadinessItem(BaseModel):
        key: Literal["cases", "results", "bugs", "gates"]; title: str; state: ItemState
        note: str | None = None; error: str | None = None
        requirements: list[ReqEntry] = []; cases: list[CaseEntry] = []
        bugs: list[BugEntry] = []; epics: list[EpicEntry] = []
    class MilestoneRef(BaseModel): id: str; title: str
    class EpicRow(BaseModel): id: str; title: str; status: str
    class Readiness(BaseModel):
        milestone: MilestoneRef; epics: list[EpicRow]; generated_at: datetime
        verdict: Verdict; items: list[ReadinessItem]   # always cases, results, bugs, gates in that order
    ```
  - Produces (`qa/readiness.py`, no I/O):
    - `GATES = ("requirement_confirmed", "plan_approved", "orchestration_ready", "implementation_complete", "shipped")`.
    - `TITLES = {"cases": "Every requirement has a case", "results": "Every case passed since its requirement changed", "bugs": "No open P0 or P1 bug", "gates": "Every epic shipped"}`.
    - `scope_requirements(trace: Trace, epics: set[str]) -> list[TraceRequirement]` (REQ-QA-007; sorted by `id`).
    - `cases_item(reqs: list[TraceRequirement] | None, export: CaseExport | None, error: str | None) -> ReadinessItem` and `results_item(...)` with the same arguments; `None` inputs with `error` give `unknown`; no requirement gives `pass` with the note "No requirement changed".
    - `bugs_item(beads: list[ReportBead] | None, epics: set[str], error: str | None) -> ReadinessItem` (not closed, `is_bug`, `priority in (0, 1)`, `source_epic` id in `epics` or `None`; sorted by priority, then id).
    - `gates_item(epics: list[EpicPlan], gates: Mapping[str, EpicWorkflow | BlockError]) -> ReadinessItem` (a gate passes when it is `satisfied` or starts with `waived`; a `BlockError` lists the epic with `gate` "unknown"; `fail` when any epic has an unmet gate, else `unknown` when any `BlockError`, else `pass`; no epic gives `pass` with the note "No epic").
    - `verdict_of(items: list[ReadinessItem]) -> Verdict`.
    - `build_readiness(detail: MilestoneDetail, trace: Trace | None, trace_error: str | None, export: CaseExport | None, export_error: str | None, beads: list[ReportBead] | None, beads_error: str | None, gates: Mapping[str, EpicWorkflow | BlockError], now: datetime) -> Readiness`.
  - Produces (`qa/router.py`): `build_router(settings, run_gin_qa, snapshots, clock, on_refresh, projects, run_gin: GinRunner, run_gw: GwRunner, run_epic_workflow: Callable[[Path, str], EpicWorkflow | BlockError])`; caches `traces = KeyedCache[str, Trace](TTL, clock)` and `gates = KeyedCache[tuple[str, str], EpicWorkflow](TTL, clock)` (a `BlockError` raises inside the fetch so it is not kept, and is turned back into a `BlockError` for the item), both cleared through `on_refresh`; `GET /qa/readiness/{project}/{milestone}`: `project_dir` first, `valid_id(milestone)`, 404 when the snapshot reads and has no row of `issue_type` `milestone` with that id (as `milestones/router.py:96-98`), `show_milestone` failing answers `JSONResponse(502, {"error": str(exc)})`, the gates fetched on a `ThreadPoolExecutor(max_workers=4, thread_name_prefix="qa-gates")` created once per router.
- **Provider role**: `backend`
- **Model:** `opus`
- **Effort:** `high`
- **Why:** joins five sources from four contexts with partial-failure rules that must never turn a failure into a pass, plus bounded concurrency over a cache: the rubric's cross-module and concurrency row.
- **Steps**:
  1. `test_qa_readiness.py` first (pure functions): every scenario of REQ-QA-007 and REQ-QA-008 naming them, with `fake_gin.trace`/`req` rows (`changes` with `op` `added`, `modified`, `removed`, `archived` set and unset), `fake_gin_qa.case` rows, `ReportBead` rows built as `tests/report_beads.py` does, and `EpicWorkflow`/`BlockError` gates; add a `proposed` requirement in scope, a closed epic with every gate satisfied, and an epic whose gates dict lacks `shipped` (counts as unmet). Run `uv --directory backend run pytest tests/test_qa_readiness.py`; expect import errors. Write `readiness.py` and the models.
  2. `test_qa_readiness_api.py`: every scenario of REQ-QA-009 naming it, through `create_app(..., run_gin=FakeGin(...), run_gw=FakeGw(...), run_gin_qa=FakeGinQa(...), run_epic_workflow=fake)` with an export written by `write_export`; the fan-out test uses a `run_epic_workflow` fake that records the peak of concurrent calls with a `threading.Lock` and a short `time.sleep`, and asserts at most 4 and one call per epic, then none on a second request within 60 seconds; refresh runs them again; a hidden project answers 404 before any runner is called; a failing trace makes `cases` and `results` `unknown` with the error while `bugs` and `gates` are worked out.
  3. Wire the route and `app.py`. Run `uv --directory backend run pytest`, `ruff check .`, `mypy`; commit.
- **Acceptance criteria**:
  - Every scenario of REQ-QA-007, REQ-QA-008 and REQ-QA-009 has a test naming the REQ-ID.
  - No failed source makes an item `pass`; `pytest`, `ruff check .`, and `mypy` pass.
- **Estimated complexity**: high

### Track 3: Tests page, case page and navigation (frontend)
- **Dependencies**: none
- **Requirements**: REQ-QA-010, REQ-QA-011, REQ-QA-013, REQ-UI-055, REQ-UI-124
- **Files**:
  - Create `frontend/src/features/qa/api.ts`
  - Create `frontend/src/features/qa/filters.ts`
  - Create `frontend/src/features/qa/TestsPage.tsx`
  - Create `frontend/src/features/qa/CountsTable.tsx`
  - Create `frontend/src/features/qa/CaseList.tsx`
  - Create `frontend/src/features/qa/CasePage.tsx`
  - Create `frontend/src/features/qa/LatestRun.tsx`
  - Create `frontend/src/features/qa/QaError.tsx`
  - Modify `frontend/src/features/beads/images/Lightbox.tsx:1-99` (props `slides` instead of `project`, `beadId`, `images`)
  - Modify `frontend/src/features/beads/BeadBody.tsx:17-43` (maps its available images to slides)
  - Modify `frontend/src/app/App.tsx:19-20` (lazy `TestsPage` and `CasePage`), `:84-92` (routes `/tests` and `/tests/<project>/<id>`)
  - Modify `frontend/src/app/Layout.tsx:1` (icon `FlaskConical`), `:28-38` (`isTests` and the Tests entry between Requirements and Reports)
  - Modify `frontend/src/app/project.ts:70-72` (`"/tests"` in the `projectHref` union), `:77-97` (`switchProject` for `/tests` and `/tests/...`)
  - Test `frontend/src/features/qa/filters.test.ts`
  - Test `frontend/src/features/qa/TestsPage.test.tsx`
  - Test `frontend/src/features/qa/CasePage.test.tsx`
  - Test `frontend/src/features/qa/QaError.test.tsx`
  - Test `frontend/src/features/beads/images/Lightbox.test.tsx` (the new props; behaviour unchanged)
  - Test `frontend/src/app/Layout.test.tsx` and `frontend/src/app/App.test.tsx` (seven links)
  - Test `frontend/src/app/project.test.ts` (`switchProject` on `/tests`; REQ-UI-124 on `/tests` and the case page)
- **Interfaces**:
  - Consumes: `apiFetch` (`app/session.ts`), `field`, `isString`, `isStringOrNull`, `isFiniteNumber` (`lib/guards.ts`), `useFetched` as the pattern of `features/requirements/useFetched.ts:1-26`, `ProjectGuard`/`UnknownProject` (`app/UnknownProject.tsx:6-26`), `isUnknownProject`, `rememberProject`, `resolveProject`, `useConfiguredProjects` (`app/project.ts`), `navigate`, `useLocation` (`app/route.ts`), `usePageTitle`, `Link`, `Alert` (`components/ui/alert`), `sectionHref("matrix", project, { req })` (`features/requirements/paths.ts:5-6`), the Tests contract of Track 1 (JSON of `CaseList`, `CaseDetail`, 502 `{error, cause}`).
  - Produces (`features/qa/api.ts`):
    ```ts
    export type QaCause = "missing" | "outdated";
    export type CaseRow = { id: string; title: string; capability: string; type: string; priority: string; result: string; effective_result: string; reqs: string[]; bug: string | null; file: string };
    export type CaseCounts = { name: string; passed: number; failed: number; blocked: number; not_run: number; outdated: number; other: number; total: number };
    export type CaseList = { cases: CaseRow[]; counts: { by_capability: CaseCounts[]; by_type: CaseCounts[] } };
    export type CaseBug = { id: string; title: string | null; status: string | null; priority: number | null };
    export type RunStep = { n: number; title: string; status: string; error: string | null; screenshot: boolean };
    export type LatestRun = { folder: string; status: string | null; started: string | null; finished: string | null; error: string | null; steps: RunStep[] };
    export type CaseDetail = Omit<CaseRow, "bug"> & { preconditions: unknown[]; steps: unknown[]; expected: unknown[]; bug: CaseBug | null; latest_run: LatestRun | null; latest_run_reason: "no_run" | "not_on_host" | "invalid" | null };
    export class QaFailure extends Error { readonly status: number; readonly cause: QaCause | null }
    export function fetchCases(project: string): Promise<CaseList>;
    export function fetchCase(project: string, id: string): Promise<CaseDetail>;
    export const screenshotUrl = (project: string, id: string, n: number): string => `/api/qa/cases/${enc(project)}/${enc(id)}/run/steps/${n}/screenshot`;
    export const testsHref = (project: string, extra: Readonly<Record<string, string>> = {}): string => `/tests?${new URLSearchParams({ project, ...extra }).toString()}`;
    export const caseHref = (project: string, id: string): string => `/tests/${enc(project)}/${enc(id)}`;
    export const RESULT_KEYS = ["passed", "failed", "blocked", "not_run", "outdated", "other"] as const;   // `not_run` is the URL value of "not run"
    ```
    Guards check only the fields above; unknown keys pass.
  - Produces (`features/qa/filters.ts`): `type CaseFilters = { capability: string | null; type: string | null; result: (typeof RESULT_KEYS)[number] | null; q: string }`; `parseCaseFilters(search: string): CaseFilters`; `caseFiltersToSearch(project: string, f: CaseFilters): string`; `filterCases(cases: readonly CaseRow[], f: CaseFilters): CaseRow[]` (`result` `not_run` matches `not run`, `other` matches any value outside the five; `q` matches id or title, case-insensitive).
  - Produces (components): `TestsPage()` (current project as `RequirementsPage.tsx:56-60`: `?project` written with `navigate(..., { replace: true })`, `rememberProject`); `CountsTable({ title, rows, groupKey, onPick })` (`groupKey` `"capability" | "type"`, `onPick(group: string, result: ResultKey)`; a `<table>` inside `overflow-x-auto`); `CaseList({ project, cases })`; `CasePage({ project, id })`; `LatestRun({ project, caseId, run, reason })`; `QaError({ failure, onRetry })` with the texts of REQ-QA-013.
  - Produces (`Lightbox.tsx`): `export type LightboxSlide = { key: number; src: string; caption: string }`; `Lightbox({ slides, current, onChange, onClose }: { slides: readonly LightboxSlide[]; current: number | null; onChange(key: number): void; onClose(): void })`; `k of m` over `slides`; "Open original" links to `src`. `BeadBody` passes `images.filter((i) => i.available).map((i) => ({ key: i.n, src: imageUrl(project, bead.id, i.n), caption: i.caption }))`; `LatestRun` passes the steps with `screenshot` as `{ key: n, src: screenshotUrl(...), caption: \`${n}. ${title}\` }`.
  - Produces (`Layout.tsx`): `{ to: (project) => projectHref("/tests", project), label: "Tests", short: null, icon: FlaskConical, current: ({ path }) => path === "/tests" || path.startsWith("/tests/") }` between Requirements and Reports.
  - Produces (`project.ts`): `switchProject("/tests", search, name)` keeps `q` only; `switchProject("/tests/<p>/<id>", ...)` returns `projectHref("/tests", name)`. `TestsPage` and `CasePage` call `rememberProject` with the project they show, and `TestsPage` writes the current project into a URL without `project` with `navigate(..., { replace: true })` (REQ-UI-124).
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded pages in existing patterns (Requirements page project handling, MarkdownView-free tables, the base-ui Dialog lightbox) with every text, route and filter written in the spec.
- **Steps**:
  1. `filters.test.ts` and `TestsPage.test.tsx` first: every scenario of REQ-QA-010 naming it (mocked `apiFetch`), the 390px check by class (`overflow-x-auto` on each table frame, no fixed width over 390px), and the Tests page scenarios of REQ-QA-013. Run `pnpm -C frontend test --run src/features/qa`; expect failures. Write `api.ts`, `filters.ts`, `CountsTable.tsx`, `CaseList.tsx`, `QaError.tsx`, `TestsPage.tsx`.
  2. `Lightbox.test.tsx` rewritten to the new props with the same REQ-BEADS-030 assertions; `BeadBody` mapping; run `pnpm -C frontend test --run src/features/beads` to keep the bead image tests green.
  3. `CasePage.test.tsx`: both scenarios of REQ-QA-011 naming it, the three reasons, the bug with only an id, the requirement links to `sectionHref("matrix", project, { req })`, and the failed states of REQ-QA-013. Write `CasePage.tsx` and `LatestRun.tsx`.
  4. `Layout.test.tsx`, `App.test.tsx`: the "Seven links" and "Short label" scenarios of REQ-UI-055; `project.test.ts` and `TestsPage.test.tsx`: `switchProject` on `/tests`, and the changed "Links carry the project" and new "Tests of the current project" scenarios of REQ-UI-124. Wire `App.tsx`, `Layout.tsx`, `project.ts`.
  5. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build`; commit.
- **Acceptance criteria**:
  - Every scenario of REQ-QA-010, REQ-QA-011, REQ-QA-013 and the changed scenarios of REQ-UI-055 and REQ-UI-124 have a test naming the REQ-ID; the existing bead image, Lightbox and navigation tests pass with their updates.
  - `vitest`, `typecheck`, `lint`, and `build` pass.
- **Estimated complexity**: medium

### Track 4: Readiness tab on the milestone page (frontend)
- **Dependencies**: Track 3
- **Requirements**: REQ-QA-012, REQ-MILESTONE-UI-018
- **Files**:
  - Create `frontend/src/features/milestones/ReadinessTab.tsx`
  - Modify `frontend/src/features/milestones/MilestonePage.tsx:28-33` (`TABS` gains Readiness), `:51` (`tab` reads `readiness`), `:96-115` (renders `ReadinessTab`)
  - Modify `frontend/src/features/milestones/api.ts:352` (`MilestoneTab` gains `"readiness"`)
  - Modify `frontend/src/features/qa/api.ts` (readiness types and `fetchReadiness`)
  - Test `frontend/src/features/milestones/ReadinessTab.test.tsx`
  - Test `frontend/src/features/milestones/MilestonePage.test.tsx` (`tab=readiness`, changing tab keeps `start` and `zoom`)
- **Interfaces**:
  - Consumes: `Tabs` (`components/Tabs`), `milestonePath` (`features/milestones/api.ts:355`), `useFetched` pattern, `caseHref` and `QaFailure` from Track 3, `sectionHref`, the bead page path `/beads/<project>/<id>`, the readiness contract of Track 2.
  - Produces (`features/qa/api.ts`):
    ```ts
    export type ItemState = "pass" | "fail" | "unknown";
    export type ReadinessItem = { key: "cases" | "results" | "bugs" | "gates"; title: string; state: ItemState; note: string | null; error: string | null;
      requirements: { id: string; title: string; capability: string }[];
      cases: { id: string; title: string; effective_result: string; bug: string | null }[];
      bugs: { id: string; title: string; priority: number; epic: { id: string; title: string } | null }[];
      epics: { id: string; title: string; gate: string }[] };
    export type Readiness = { milestone: { id: string; title: string }; epics: { id: string; title: string; status: string }[]; generated_at: string; verdict: "ready" | "not_ready" | "unknown"; items: ReadinessItem[] };
    export function fetchReadiness(project: string, milestone: string): Promise<Readiness>;   // GET /api/qa/readiness/<project>/<milestone>
    ```
  - Produces (`ReadinessTab.tsx`): `ReadinessTab({ project, milestoneId }: { project: string; milestoneId: string })`: "Ready" / "Not ready" / "Unknown" heading; one `<section>` per item with a mark icon plus its word ("Pass", "Fail", "Unknown"), the count of its list, its note or error, and a disclosure button (`aria-expanded`) that shows the list with links; "Loading readiness…" while loading; the error with a "Try again" button that calls `retry`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** one tab component and a tab-list change in an existing page, every text and link written in the spec.
- **Steps**:
  1. `ReadinessTab.test.tsx` first: both scenarios of REQ-QA-012 naming it, the "Ready" and "Unknown" verdicts, each list's links (matrix, case page, bead page with `P<n>` and "Unknown source", epic with its gate), the mark word next to each icon (not colour alone), and loading. Run `pnpm -C frontend test --run src/features/milestones/ReadinessTab.test.tsx`; expect failures. Write the types, `fetchReadiness` and `ReadinessTab.tsx`.
  2. `MilestonePage.test.tsx`: the "Readiness tab" scenario of REQ-MILESTONE-UI-018 naming it, and the existing "Changing tab" test still passing. Wire `MilestonePage.tsx` and `MilestoneTab`.
  3. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build`; commit.
- **Acceptance criteria**:
  - Every scenario of REQ-QA-012 and the new scenario of REQ-MILESTONE-UI-018 has a test naming the REQ-ID; the existing milestone page tests pass.
  - `vitest`, `typecheck`, `lint`, and `build` pass.
- **Estimated complexity**: medium

### Track 5: QA cases and e2e specs for Test coverage
- **Dependencies**: Track 2, Track 4
- **Requirements**: REQ-QA-001, REQ-QA-002, REQ-QA-003, REQ-QA-004, REQ-QA-005, REQ-QA-006, REQ-QA-007, REQ-QA-008, REQ-QA-009, REQ-QA-010, REQ-QA-011, REQ-QA-012, REQ-QA-013, REQ-UI-055, REQ-UI-124, REQ-MILESTONE-UI-018
- **Files**:
  - Create cases in `qa/cases/qa/` and modify the stale cases of `REQ-UI-055` and `REQ-UI-124` in `qa/cases/ui/` and of `REQ-MILESTONE-UI-018` in `qa/cases/milestone-ui/`, as `gin-qa cases plan --change gin-console-rm-test-coverage` lists them
  - Create `backend/tests/test_qa_cases_api.py` for the `api` cases (the gin-qa `api` glob is `backend/tests/test_*_api.py`)
  - Create `qa/e2e/support/qa.ts` (stub builders for `/api/qa/cases`, `/api/qa/cases/<p>/<id>`, the screenshot route and `/api/qa/readiness/<p>/<m>`, used with `stubApi` of `qa/e2e/support/api.ts`)
  - Create e2e specs under `qa/e2e/qa/` and modify the specs of stale cases
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases and specs from written scenarios in the existing gin-qa patterns; e2e writing stays on the middle model, as the user asked for e2e and test agents.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-rm-test-coverage` prints `ok`, `gin-qa cases plan --change gin-console-rm-test-coverage` lists nothing missing, stale or obsolete, and `gin-qa e2e plan` lists none of the change's cases as missing or stale.
  - The new and changed e2e specs pass on the built UI, run with a Playwright config outside the repo on port 8702 (port 8701 is held by an older server; never stop it): the Tests page tables and a count as filter, a failed case with its bug, a case page with step screenshots and the lightbox, the three reasons for no run, the Readiness tab "Not ready" with its lists, seven links in the main navigation, and the Tests page at 390px without horizontal page scroll.
- **Estimated complexity**: medium

## Integration
- **Branch**: `feat/test-coverage` (the spec branch; it is checked out in `.planning/worktrees/test-coverage`, based on `master` `aa0cb1e`)
- **Merge strategy**: parallel-then-merge: Tracks 1 and 3 at once in worktrees from `feat/test-coverage`; Track 2 after Track 1 merges into it; Track 4 after Track 3 merges; Track 5 after Tracks 2 and 4 merge.
- **Overlap with gin-console-rm-shared-attachments** (`feat/shared-attachments`, based on `e2653bc`): both change `backend/src/gin_console/beads/images.py` (this plan adds `read_image` next to `check`; that one adds attachment references and states), `frontend/src/features/beads/images/Lightbox.tsx` and `frontend/src/features/beads/BeadBody.tsx` (this plan turns the Lightbox props into `slides`; that one chooses the image address by `served_as`), and `app.py` `create_app` parameters (`run_gin_qa` here, a git runner there). Whichever ships second merges `master` first and keeps both: with `slides`, the attachment address of that epic becomes the `src` that `BeadBody` builds. ADR numbers do not collide (0006 there, 0007 here).
- **Shared checkout**: other sessions may use the main checkout; this epic never switches it. Right before merging to `master` at ship, compare `origin/master` with the base of the branch.

## Validation
- [ ] `uv --directory backend run pytest`, `uv --directory backend run ruff check .`, and `uv --directory backend run mypy` pass
- [ ] `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, and `pnpm -C frontend build` pass
- [ ] `gin specs lint --change gin-console-rm-test-coverage --against master` prints `ok` and `gin specs trace --change gin-console-rm-test-coverage` reports no missing REQ
- [ ] `gin-qa cases check --change gin-console-rm-test-coverage` prints `ok`
- [ ] Manual check on the built UI against this host's gin-console: the Tests page shows the counts of `gin-qa cases export` (935 cases on 2026-11-27, moving as cases are re-run); `/tests/gin-console/TC-UI-115` shows its latest run from `qa/evidence/2026-11-23T10-34-33` with the step screenshot; the Readiness tab of milestone `gin-console-9ge` lists its requirements without a case, its cases not passed, its open P0/P1 bugs and its epics not shipped, each linked; a project without gin-qa on PATH shows "gin-qa is not installed on the console host".

## Notes
- The user may override `Model:` and `Effort:` before plan approval.
- Provider roles describe responsibility rather than filename patterns.
- `03-design.md` puts the readiness rules in `qa/service.py`; this plan gives them their own `qa/readiness.py` (one responsibility per file) and keeps `service.py` for the case list and detail.
- `03-design.md` mentions `app/origin.ts`; no REQ asks for a bead page's breadcrumb to return to the Tests page, so `origin.ts` is left unchanged.
- REQ-UI-124 names the pages that write and remember the current project and does not list Tests; the Tests page follows REQ-QA-010 ("for the current project (REQ-UI-124)") with the same behaviour as the Requirements page.
- Deliverable merge-holds apply exclusively to the Parent Bead (`gin-console-rm-test-coverage`). Individual track beads close after tests and review pass so dependents unblock.
