# Design: Windows support

Epic: gin-console-bpj

## Architecture
Backend enhancements across `gin_console.projects.collect`, `gin_console.quota.source`, and `gin_console.sessions.source`, plus a helper wrapper in `scripts/`. No frontend changes required.

- **`projects/collect.py`**:
  - `_child_env()`: Uses `os.path.join(venv, "Scripts" if sys.platform == "win32" else "bin")` to remove the console's virtualenv directory from `PATH`.
  - Command dispatch: When `sys.platform == "win32"` and `cmd[0] == "gin-workflow"`, locate bash (`shutil.which("bash")` or `C:\Program Files\Git\bin\bash.exe`) and invoke as `[bash_path, script_path, *cmd[1:]]`.
- **`scripts/gin-workflow.cmd`**:
  - Batch wrapper script for Windows users invoking `gin-workflow` directly from CMD or PowerShell via Git Bash.
- **`quota/source.py`**:
  - `_end(process)`: On Windows, use `subprocess.run(["taskkill", "/F", "/T", "/PID", str(process.pid)], capture_output=True)` (with fallback to `process.kill()`) rather than calling POSIX-only `os.killpg()`.
  - `_codex_conversation()`: Replace `select.select([stdout], ...)` with a daemon worker thread that pushes decoded lines from `stdout` into a thread-safe `queue.Queue`. The answer waiter polls the queue with `queue.get(timeout=remaining)`. This eliminates `WinError 10038` on Windows while remaining fully portable.
- **`sessions/source.py`**:
  - `_is_pid_alive(pid: int)`: On Windows, use `ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)` (`PROCESS_QUERY_LIMITED_INFORMATION`). If valid handle returned, close handle and return `True`. Fall back to `/proc/{pid}` on POSIX.
  - Path normalization: Extend `_ENCODE` to translate `\` and `:` to `-` for Windows paths (`C:\Users\...` -> `C--Users-...`).

## Data Flow
No changes to external API shapes or client payloads. Collectors and endpoints continue to produce standard `Beads`, `Workflow`, `ClaudeQuota`, `CodexQuota`, and `SessionSummary` schemas.

## Error Handling
Gracefully falls back to standard behavior or descriptive `SourceError` / `CollectError` if optional tools (e.g., `bash.exe` or `taskkill`) are unavailable on Windows.

## Testing
- Unit tests in `backend/tests/`:
  - `test_collect.py`: verify Windows `_child_env()` and command transformation when `sys.platform == "win32"`.
  - `test_quota_source.py`: verify cross-platform queue-based stdout reader and Windows termination.
  - `test_sessions_list.py`: verify Windows process liveness and path normalization.
- Ensure all Linux test suites pass.
