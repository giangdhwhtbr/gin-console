# Plan: Contract check for the gin CLI

Epic: gin-console-rm-gin-contract
Spec: `01-proposal.md`, `02-spec-delta.md`, and `03-design.md` in this folder.

## Objective

An operator who has just installed a gin-workflow release runs `python -m gin_console check-contract` and learns whether the console still reads the JSON of the five `gin` calls it uses. On the same path:
- `gin` can be pointed to with `gin.path`.
- No `gin` child process sees `CLAUDE_CODE_SESSION_ID`.
- The Docker defaults name one current tag.

Done when:
- Every scenario of `REQ-CONFIG-010`, `REQ-SERVER-013` and `REQ-SERVER-014` has a test naming the REQ-ID.
- `uv --directory backend run pytest`, `ruff check .` and `mypy` pass.
- `check-contract --project gin-console` on this host prints `ok` for each call and exits 0. Its output is kept for the review.
- `gin specs lint --change gin-console-rm-gin-contract --against master` prints `ok`, `gin specs trace` reports no missing REQ, and `gin-qa cases check --change gin-console-rm-gin-contract` prints `ok`.

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
  - Every `gin` call goes through `_run` (`backend/src/gin_console/projects/collect.py:84-102`). It runs `_resolve_cmd(cmd)`, which finds `gin` on PATH or the Windows shim, with `_child_env()` (`:33-49`). That function copies `os.environ` and drops only `VIRTUAL_ENV`.
  - A `FileNotFoundError` becomes `gin not found` (`:96-97`), which names no fix.
  - `collect_epic_workflow` (`:154-175`) parses `gin state` inline and turns every error into a `BlockError`.
  - The other four calls have parse functions that take an injected runner:
    - `list_milestones` and `show_milestone` (`milestones/source.py:57`, `:129`);
    - `load_trace` and `load_reqs` (`requirements/source.py:41`, `:53`).
  - The `GIN_WORKFLOW_REF` defaults are `v1.4.2` (`docker-compose.yml:8`) and `v3.0.0` (`Dockerfile:23`). The host runs `gin 3.5.4`, which is also the newest tag.
- **Success criteria:** the REQs above, with the checks of the Objective.
- **Global constraints**, from the spec and the user decisions of 2026-11-28:
  - **Calls:** the check runs exactly the server's argv and path: `run_json` and `_child_env`, with the same timeouts as each source module. It parses with the console's own functions.
  - **Ids:**
    - Without `--epic`, take the newest epic (by `created_at`) of each kind present in the project's `.beads/issues.jsonl`. The kind comes from `beads/kinds.py` `kind_of`. A kind with no epic prints `not covered` and is not a failure.
    - Without `--milestone`, take the first milestone of `gin milestone list`. An empty list skips `show` with a note.
  - **Exit status:** 0 when no call failed; 1 when a call failed to run or printed `missing:` or `type:`; 2 for a bad argument or an unknown project.
  - **New keys:** printed as `new: <path>` notes, never a failure, and only inside objects a console model reads.
  - **`gin.path`:**
    - Optional and absolute. When set, every `gin` call runs that file.
    - When unset, `gin` is found as today.
    - Not found: `gin not found: set gin.path in <config file>`.
  - **Environment:** `_child_env` also drops `CLAUDE_CODE_SESSION_ID`.
  - **Read-only:** the check writes nothing and runs no `bd`.
  - **Platforms:** Linux, macOS and native Windows keep working.
- **Non-goals:** running the check in unit tests, on a schedule or in CI; `gin-qa`; any gin-workflow change; any page change.

## Approach Options
### Option 1: one subcommand over the server's own runner and parsers
- **Summary:**
  - Track 1 adds `gin.path`, the environment filter, `parse_epic_workflow`, `projects/contract.py`, the `__main__` dispatch, the Docker defaults and the docs.
  - Track 2 writes the QA cases and their tests.
- **Pros:** the check fails exactly where the server would.
- **Cons:** the new-key walk must follow the models by hand.

### Option 2: pytest suite run by hand
- **Summary:** a `contract` marker that calls the real `gin`.
- **Cons:** rejected at discuss. Unit tests must not run real CLIs, and an installed host has no test environment.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** the design confirmed at discuss.

## Scope
- **In scope:**
  - REQ-CONFIG-010, REQ-SERVER-013, REQ-SERVER-014.
  - The Docker defaults.
  - README and `config.example.yaml`.
  - The QA cases of these REQs.
- **Out of scope:** the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Track 2 writes cases and tests for the command Track 1 builds, so they run one after the other on feat/gin-contract.
```

## Tasks

### Track 1: gin.path, gin environment, contract check command, Docker defaults
- **Dependencies**: none
- **Requirements**: REQ-CONFIG-010, REQ-SERVER-013, REQ-SERVER-014
- **Files**:
  - Modify `backend/src/gin_console/config.py:135-143`: `GinSettings` and `Settings.gin`.
  - Modify `backend/src/gin_console/projects/collect.py:33-49`: drop `CLAUDE_CODE_SESSION_ID`.
  - Modify `backend/src/gin_console/projects/collect.py:67-102`: `configure_gin`, the configured path in `_resolve_cmd`, and the not-found message.
  - Modify `backend/src/gin_console/projects/collect.py:154-175`: `parse_epic_workflow`.
  - Create `backend/src/gin_console/projects/contract.py`
  - Modify `backend/src/gin_console/__main__.py:18-31`: the `check-contract` dispatch, and `configure_gin` after `load_settings`.
  - Modify `docker-compose.yml:8`: `v3.5.4`.
  - Modify `Dockerfile:23`: `v3.5.4`.
  - Modify `config.example.yaml`: a commented `gin:` block.
  - Modify `README.md`: `gin.path` in the config section, and a "Contract check" section next to the deployment docs.
  - Test `backend/tests/test_contract.py`
  - Test `backend/tests/test_collect.py`
  - Test `backend/tests/test_config.py`
  - Test `backend/tests/test_main.py`
- **Interfaces**:
  - Consumes:
    - `run_json`, `CollectError`, `EpicWorkflow`, `_strings`, `_waivers` (`projects/collect.py`).
    - `list_milestones`, `show_milestone`, `MilestonesError`, `GW_TIMEOUT` (`milestones/source.py`).
    - `load_trace`, `load_reqs`, `RequirementsError`, `GIN_TIMEOUT` (`requirements/source.py`).
    - `read_export` (`beads/source.py:74`) and `kind_of` (`beads/kinds.py:24`).
    - `load_settings`, `resolve_config_path`, `ConfigError`, `AbsolutePath` (`config.py`).
    - Test fakes: `tests/fake_gw.py`, `tests/fake_gin.py`, `tests/fakes.py`, `tests/fake_export.py`.
  - Produces (`config.py`):
    ```python
    class GinSettings(BaseModel):   # extra="forbid"
        path: AbsolutePath | None = None
    # Settings gains: gin: GinSettings = Field(default_factory=GinSettings)
    ```
  - Produces (`projects/collect.py`):
    ```python
    def configure_gin(path: Path | None, config_file: Path | None) -> None
        # module state read by _resolve_cmd and _run: with a path, a cmd starting with "gin" runs
        # [str(path), *rest] (on Windows, a path without a .cmd/.bat/.exe suffix runs through bash
        # as today's fallback does); without one, today's lookup
    # _run: FileNotFoundError for "gin" -> CollectError(f"gin not found: set gin.path in {config_file}")
    #       (just "gin not found" when no config file is known)
    def parse_epic_workflow(data: Any) -> EpicWorkflow   # the inline parse of collect_epic_workflow
    ```
    `_child_env` drops `CLAUDE_CODE_SESSION_ID`. `collect_epic_workflow` calls `parse_epic_workflow` and keeps its `BlockError` handling unchanged.
  - Produces (`projects/contract.py`):
    ```python
    @dataclass(frozen=True)
    class Finding:
        kind: Literal["missing", "type", "error", "new", "note"]
        path: str          # "a.b[0].c", or "" for a whole-call error or note
        message: str
    @dataclass(frozen=True)
    class CallReport:
        call: str          # e.g. "gin milestone list --all --json"
        findings: list[Finding]
        @property
        def failed(self) -> bool   # any finding of kind missing, type or error
    def findings_of(exc: Exception) -> list[Finding]
        # ValidationError -> one per error: type "missing" -> missing, else type with err["msg"];
        # KeyError -> missing at its key; TypeError -> type; MilestonesError/RequirementsError/CollectError -> error
    def new_keys(model: BaseModel, raw: Any, path: str = "") -> list[Finding]
        # walks fields of `model` and the matching dict/list in `raw`; a raw key that is no field
        # (by field name or alias) is a "new" finding; recurses into nested models and lists of models
    def choose_epics(rows: Sequence[Mapping[str, Any]]) -> dict[str, str | None]
        # {"capability": id|None, "technical": id|None, "parity": id|None}, newest created_at first
    def run_check(cwd: Path, epics: Sequence[str] | None, milestone: str | None,
                  runner: Callable[[list[str], Path, float], Any]) -> list[CallReport]
        # runner(argv_without_gin_prefix_included, cwd, timeout) -> decoded JSON; default wraps run_json
    def main(argv: Sequence[str], env: Mapping[str, str] = os.environ, out: TextIO = sys.stdout) -> int
    ```
    - Report format, one block per call:
      ```
      gin milestone list --all --json: ok
      gin state --workflow-id x --format json: FAILED
        missing: gates
        new: review_waivers[0].bead
      technical: not covered
      ```
    - The exit status follows the Global constraints.
  - Produces (`__main__.py`):
    - `argv[:1] == ["check-contract"]` returns `contract.main(argv[1:])`.
    - The server path calls `configure_gin(settings.gin.path, resolve_config_path(os.environ))` before `create_app`.
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** bounded backend work with a clear spec, but the model-against-JSON walk and the error-to-path mapping have many edge cases (aliases, nested lists, optional fields, the hand-written `gin state` parse). That raises the effort, not the model.
- **Steps**:
  1. Write failing tests in `test_collect.py`:
     - REQ-SERVER-014: `_child_env` drops `CLAUDE_CODE_SESSION_ID` and keeps others.
     - REQ-CONFIG-010:
       - `configure_gin(tmp script)` makes `run_json(["gin", ...])` start that script. Use a tiny executable script in `tmp_path` that prints JSON; skip on win32.
       - The not-found message names `gin.path` and the config file.
     - `parse_epic_workflow` gives the same `EpicWorkflow` as `collect_epic_workflow` for `tests/fakes.py` data.
     - Run `uv --directory backend run pytest tests/test_collect.py` and expect failures. Change `collect.py`.
  2. `test_config.py`, REQ-CONFIG-010: the default, an absolute path, and a relative path refused naming `gin.path`. Change `config.py`.
  3. `test_contract.py`, REQ-SERVER-013, with a fake runner keyed by argv that returns canned dicts. Cover:
     - every call `ok`;
     - a milestone without `id` printing `missing: milestones[0].id`;
     - `stage` as a number printing a type error at `stage`;
     - an extra key in a trace requirement giving a `new:` note and exit 0;
     - only capability epics giving `technical` and `parity` not covered;
     - an empty milestone list skipping `show` with a note;
     - a `CollectError` from the runner giving an `error` finding and exit 1;
     - `--project ghost` giving exit 2;
     - `choose_epics` taking the newest by `created_at`.
     - Write `contract.py`.
  4. `test_main.py`:
     - `main(["check-contract", "--project", "x"])` dispatches. Monkeypatch `contract.main`.
     - The server path calls `configure_gin`. Monkeypatch `uvicorn.run`.
     - Change `__main__.py`.
  5. Set both Docker defaults to `v3.5.4`. Update `config.example.yaml` and the README. The README states the command, the exit statuses, and that it needs no running server.
  6. Run `uv --directory backend run pytest`, `ruff check .` and `mypy`.
  7. Run `uv --directory backend run -m gin_console check-contract --project gin-console` on this host. It uses the user's real config at `~/.config/gin-console/config.yaml`, read-only. Save its output in the commit message body or the bead notes as evidence. A `FAILED` call that is a real contract break goes to the user, not into a fix of the console models.
  8. Commit.
- **Acceptance criteria**:
  - Every scenario of the three REQs has a test naming the REQ-ID.
  - The existing collect, config, main and beads workflow tests pass unchanged.
  - `pytest`, `ruff check .` and `mypy` pass.
  - The host run output is recorded.
- **Estimated complexity**: medium

### Track 2: QA cases for the contract check, gin.path and the gin environment
- **Dependencies**: Track 1
- **Requirements**: REQ-CONFIG-010, REQ-SERVER-013, REQ-SERVER-014
- **Files**:
  - Create cases in `qa/cases/config/` and `qa/cases/server/`, as `gin-qa cases plan --change gin-console-rm-gin-contract` lists them. Use the case types the guidelines allow; the check is a CLI with no page, so there are no e2e cases.
  - Modify or create `backend/tests/test_server_cases_api.py` and `backend/tests/test_config_cases_api.py`, or the existing cases test files of those capabilities, for the automated cases with `# TC:` markers.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases and tests from written scenarios in the existing gin-qa patterns.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-rm-gin-contract` prints `ok`.
  - `gin-qa cases plan --change gin-console-rm-gin-contract` lists nothing missing, stale or obsolete.
  - `gin-qa tests plan` lists none of the change's automated cases as missing or stale.
  - The case tests pass, and `ruff` and `mypy` are clean.
- **Estimated complexity**: low

## Integration
- **Branch**: `feat/gin-contract`
- **Merge strategy**: sequential (both tracks commit on `feat/gin-contract`).

## Validation
- [ ] `uv --directory backend run pytest`, `uv --directory backend run ruff check .` and `uv --directory backend run mypy` pass.
- [ ] `gin specs lint --change gin-console-rm-gin-contract --against master` prints `ok`, and `gin specs trace --change gin-console-rm-gin-contract` reports no missing REQ.
- [ ] Manual: `check-contract --project gin-console` exits 0 on this host. With `gin.path` set to a missing file, the console's Milestones page shows the `gin.path` message.

## Notes
- The user may override `Model:` and `Effort:` before plan approval.
- Deliverable merge-holds apply only to the Parent Bead `gin-console-rm-gin-contract`. Track beads close after tests and review pass.
