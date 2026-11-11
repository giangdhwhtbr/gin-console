# Beads jsonl

Epic: gin-console-vqc
Date: 2026-11-11

## Why

On native Windows one `bd export` takes about 60 seconds, so the Beads page, My Tasks (one export per project), the Projects counts and Reports are unusable there. `bd` 1.0.5 can keep `.beads/issues.jsonl` up to date by itself (`export.auto`), and that file holds exactly what `bd export` prints. Reading the file costs a `stat` and a parse instead of starting `bd` and opening Dolt. The reopen count of a bead page is the only other `bd` call (`bd history`, one per bead page); it is dropped to remove `bd` from the console's runtime.

## What Changes

- The server reads each project's beads from `.beads/issues.jsonl` instead of running `bd export`, and reads the file again only when its modification time or size changes.
- A missing file is a per-project error that names the commands to turn on `export.auto`.
- A file older than the store's last write (bd skips an export inside its throttle interval) is still served, with `stale: true` in the project's `beads` summary; the Beads page and My Tasks show a note with the command to refresh it.
- The reopens endpoint, the `bd history` call and the "Reopened N times" text on the bead page are removed. Reports keep their reopens, which come from gin-workflow `ai_usage.quality`.
- The console no longer runs `bd` at all.
- README: how to turn on `export.auto` per project, including on Windows.

## User Stories

### US-1: Beads load fast on Windows
As a console user on Windows, I want the Beads page and My Tasks to load without waiting for `bd`, so that I can use the console there.
REQ: REQ-BEADS-003, REQ-BEADS-004, REQ-BEADS-012

Acceptance criteria:
- No request of the console starts a `bd` process.
- Lists, details, comments, project counts and reports of a project come from one read of `.beads/issues.jsonl`, repeated only when the file changes or on Refresh.

### US-2: Know when beads cannot be read
As a console user, I want a clear message when a project has no export file, so that I know how to turn it on.
REQ: REQ-BEADS-005

Acceptance criteria:
- A project without `.beads/issues.jsonl` answers 502 with an `error` naming `bd config set export.auto true` and `bd config set export.interval 1s`.
- A malformed line fails the read with a message; a bead with wrong field types is left out of a list.

### US-3: Know when beads may be out of date
As a console user, I want to see when a project's export is older than its last bead write, so that I do not trust stale data.
REQ: REQ-BEADS-013, REQ-UI-103

Acceptance criteria:
- After a bead write that bd did not export, `/api/projects` reports `stale: true` for that project and the Beads page and My Tasks show a note with `bd export -o .beads/issues.jsonl`.
- After the file is written again, the note is gone.

### US-4: Bead page without reopens
As a console user, I want the bead page without the reopen count, so that opening a bead never waits for `bd history`.
REQ: REQ-BEADS-011, REQ-UI-086, REQ-UI-087

Acceptance criteria:
- `GET /api/beads/{project}/{id}/reopens` no longer exists.
- The bead page shows "Bugs found" as before and no reopens text, loading state or error.

## Capabilities Affected

- `beads`: MODIFIED REQ-BEADS-003, REQ-BEADS-004, REQ-BEADS-005, REQ-BEADS-012; REMOVED REQ-BEADS-011; ADDED REQ-BEADS-013.
  - Diagram: `docs/specs/beads/diagrams/export-read-activity.md`.
- `ui`: MODIFIED REQ-UI-086, REQ-UI-087; ADDED REQ-UI-103.
- Assets: none.

## Non-goals

- Running `bd` from the console to refresh a stale or missing file.
- Changing a project's `.beads/config.yaml` from the console (it stays read-only).
- Removing `bd` from the Docker image (REQ-DOCKER-006).
- Changing Reports reopens, which come from gin-workflow.

## Success Criteria

- Every scenario of the ADDED and MODIFIED REQs has a test naming its REQ.
- `uv run --directory backend pytest`, `ruff check .`, `mypy`, `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass.
- On the Tailscale deploy, with `export.auto` on for gin-console and gin-workflow, the Beads page and My Tasks load with no `bd` process started (TC-1).
