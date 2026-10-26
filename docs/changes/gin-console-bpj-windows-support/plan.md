# Plan: Windows support

Epic: gin-console-bpj
Spec: `docs/changes/gin-console-bpj-windows-support/` (`proposal.md`, `spec-delta.md`, `design.md`, `tests.md`)

## Objective
Enable `gin-console` to install and run natively on Windows without requiring WSL2 or Docker, achieving full feature parity (Projects dashboard, Beads graph and details, Sessions viewer, and Claude/Codex quotas).

**Goal:** Implement cross-platform OS abstractions in `collect.py`, `quota/source.py`, and `sessions/source.py`, provide a Windows `scripts/gin-workflow.cmd` wrapper, and verify that the scenarios of `REQ-SERVER-009`, `REQ-QUOTA-008`, and `REQ-SESSIONS-009` pass.

**Architecture:**
- `projects/collect.py`: In `_child_env()`, strip `Scripts` instead of `bin` from `VIRTUAL_ENV` on Windows. When invoking `gin-workflow` on Windows, automatically locate and dispatch via `bash.exe`.
- `scripts/gin-workflow.cmd`: Provide a batch wrapper for Windows command prompt and PowerShell users.
- `quota/source.py`: Replace socket-only `select.select()` on subprocess pipes with a cross-platform daemon thread and `queue.Queue` reader with monotonic timeout. Replace `os.killpg()` with `taskkill /F /T /PID` (or `process.kill()`) on Windows.
- `sessions/source.py`: Replace `/proc/{pid}` with Windows `ctypes.windll.kernel32.OpenProcess` API check when inspecting live Claude sessions. Normalize Windows drive letters and backslashes in Claude project directory translation.

**Tech Stack:** Python 3.12, FastAPI, Uvicorn, pytest, standard library (`queue`, `threading`, `ctypes`, `subprocess`, `os`, `sys`). No new dependencies.

**Global Constraints (verbatim from the spec):**
- Support native Windows execution across all console subsystems (projects, quotas, sessions, and beads).
- In `collect.py`, sanitize child virtualenv `PATH` using `Scripts` on Windows and `bin` on POSIX, and automatically invoke `gin-workflow` via `bash.exe` (from `PATH` or Git for Windows installation) when run on Windows.
- Provide a `scripts/gin-workflow.cmd` wrapper script for Windows command line use.
- In `quota/source.py`, replace socket-only `select.select()` on subprocess stdout pipes with a cross-platform line reader queue and timeout, and terminate process trees via Windows `taskkill` / `process.kill()` instead of `os.killpg()`.
- In `sessions/source.py`, check process liveness via Windows `OpenProcess` API on Windows instead of `/proc/{pid}`, and support Windows path normalization (drive letters and backslashes) when matching Claude Code session project folders.
- Non-goals: Re-writing `gin-workflow` in pure Python or native PowerShell; `gin-workflow` remains a bash script suite executed via Git Bash (`bash.exe`). Replacing `bd` Go binary; `bd.exe` runs natively on Windows.

## Model Guidance
- `default_model_class`: `standard_impl`
- `phase_guidance`: `brainstorm`: `high_reasoning`, `design`: `high_reasoning`, `plan`: `standard_impl`, `implement`: `standard_impl`, `review`: `high_reasoning`, `docs`: `cheap_simple`

## Requirement Analysis
- Problem statement: `gin-console` contains hardcoded POSIX assumptions: `venv/bin` stripping, `select.select()` on pipes, `os.killpg()`, `/proc/{pid}`, and extensionless script execution.
- Success criteria:
  - All 3 new requirements (`REQ-SERVER-009`, `REQ-QUOTA-008`, `REQ-SESSIONS-009`) are implemented with unit tests.
  - Linux baseline test suites (`pytest` and `vitest`) continue to pass 100%.

## Approach Options
### Option 1: Native OS branching in backend with standard library (chosen)
- Summary: Use standard library `sys.platform == "win32"` checks, `queue.Queue` with timeout, `ctypes` for kernel32, and `shutil.which("bash")`.
- Pros: Zero external dependencies, robust cross-platform behavior, minimal diff.
- Cons: None.

## Scope
- In scope:
  - `backend/src/gin_console/projects/collect.py`
  - `backend/src/gin_console/quota/source.py`
  - `backend/src/gin_console/sessions/source.py`
  - `backend/tests/test_collect.py`
  - `backend/tests/test_quota_source.py`
  - `backend/tests/test_sessions_list.py`
  - `scripts/gin-workflow.cmd`
- Out of scope:
  - Frontend changes (Vite bundle runs in browser on any OS).

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Three independent backend tracks, but tightly scoped and small enough for direct implementation with verification.
```

## Tracks

### Track 1: CLI execution & child environment on Windows
- **Metadata**:
  - `Role: backend`
  - `Reasoning: standard_impl`
  - `Requirements: REQ-SERVER-009`
  - `Dependencies: []`
- **Files**:
  - `backend/src/gin_console/projects/collect.py`
  - `backend/tests/test_collect.py`
  - `scripts/gin-workflow.cmd`
- **Interfaces**:
  - `_child_env() -> dict[str, str]`
  - `run_json(cmd: list[str], cwd: Path, ...) -> Any`
- **Steps**:
  1. Add tests in `tests/test_collect.py` verifying that when `sys.platform == "win32"`, `_child_env()` removes `<venv>/Scripts` from `PATH`, and that `run_json` with `["gin-workflow", ...]` dispatches through `bash`.
  2. Implement `_child_env` and bash lookup in `collect.py`.
  3. Create `scripts/gin-workflow.cmd`.
  4. Run `uv --directory backend run pytest tests/test_collect.py`.

### Track 2: Cross-platform quota pipe reader & Windows process termination
- **Metadata**:
  - `Role: backend`
  - `Reasoning: standard_impl`
  - `Requirements: REQ-QUOTA-008`
  - `Dependencies: []`
- **Files**:
  - `backend/src/gin_console/quota/source.py`
  - `backend/tests/test_quota_source.py`
- **Interfaces**:
  - `_end(process: subprocess.Popen[bytes]) -> None`
  - `_codex_conversation(process: subprocess.Popen[bytes], deadline: float) -> Any`
- **Steps**:
  1. Add tests in `tests/test_quota_source.py` for queue-based stdout reader on mock processes and Windows process termination behavior.
  2. Update `_end()` in `quota/source.py` to use `taskkill` / `process.kill()` on Windows instead of `os.killpg()`.
  3. Replace `select.select()` in `_codex_conversation()` with a daemon reader thread and `queue.Queue(maxsize=100)`.
  4. Run `uv --directory backend run pytest tests/test_quota_source.py`.

### Track 3: Windows session process inspection & path translation
- **Metadata**:
  - `Role: backend`
  - `Reasoning: standard_impl`
  - `Requirements: REQ-SESSIONS-009`
  - `Dependencies: []`
- **Files**:
  - `backend/src/gin_console/sessions/source.py`
  - `backend/tests/test_sessions_list.py`
- **Interfaces**:
  - `_is_pid_alive(pid: int) -> bool`
  - `project_dirs(claude_home: Path, entry: ProjectEntry) -> list[Path]`
- **Steps**:
  1. Add tests in `tests/test_sessions_list.py` for Windows PID detection and drive-letter/backslash path translation.
  2. Implement `_is_pid_alive()` using `ctypes.windll.kernel32.OpenProcess` on Windows.
  3. Update `_ENCODE` in `sessions/source.py` to translate `\` and `:` to `-`.
  4. Run `uv --directory backend run pytest tests/test_sessions_list.py`.
