# Windows support

Epic: gin-console-bpj
Date: 2026-10-26

## Why
`gin-console` currently assumes a POSIX environment: it strips `bin` from `VIRTUAL_ENV` in child environments, uses POSIX-only `select.select()` and `os.killpg()` for Codex quota streaming and termination, checks `/proc/{pid}` for live Claude sessions, and invokes shell scripts like `gin-workflow` directly without Windows executable extensions or bash delegation. Developers without WSL2 or Docker cannot install or run the console natively on Windows.

## What Changes
- Support native Windows execution across all console subsystems (projects, quotas, sessions, and beads).
- In `collect.py`, sanitize child virtualenv `PATH` using `Scripts` on Windows and `bin` on POSIX, and automatically invoke `gin-workflow` via `bash.exe` (from `PATH` or Git for Windows installation) when run on Windows.
- Provide a `scripts/gin-workflow.cmd` wrapper script for Windows command line use.
- In `quota/source.py`, replace socket-only `select.select()` on subprocess stdout pipes with a cross-platform line reader queue and timeout, and terminate process trees via Windows `taskkill` / `process.kill()` instead of `os.killpg()`.
- In `sessions/source.py`, check process liveness via Windows `OpenProcess` API on Windows instead of `/proc/{pid}`, and support Windows path normalization (drive letters and backslashes) when matching Claude Code session project folders.

## User Stories

### US-1: Run gin-console natively on Windows
As a Windows developer without WSL2 or Docker, I want to install and start `gin-console` natively, so that I can view projects, beads, sessions, and quotas from my browser.
REQ: REQ-SERVER-009, REQ-QUOTA-008, REQ-SESSIONS-009

Acceptance criteria:
- `gin-console` starts up without crashing on Windows with default config.
- Project status collectors run without virtual environment corruption or executable not found errors.
- Claude Code and Codex quota endpoints return successfully without `WinError 10038` or missing `os.killpg`.
- Session viewer identifies live Claude sessions on Windows.

## Capabilities Affected
- `server`
- `quota`
- `sessions`

## Non-goals
- Re-writing `gin-workflow` in pure Python or native PowerShell; `gin-workflow` remains a bash script suite executed via Git Bash (`bash.exe`).
- Replacing `bd` Go binary; `bd.exe` runs natively on Windows.

## Success Criteria
- All new Windows-specific branching logic has unit tests with platform mocking (`sys.platform == "win32"`).
- All 280 pytest backend tests and 350 frontend tests continue to pass on Linux baseline.
