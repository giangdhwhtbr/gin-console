# Project beads

Epic: gin-console-plp
Date: 2026-11-11

## Why

The Beads page, My Tasks, Milestones and Reports call `GET /api/projects` only for the project names, `exists` and the beads summary. That endpoint also builds each project's `workflow` block with `gin state --format json`, and gin-workflow runs `bd list` and `bd show` inside it. On 2026-11-11 it took about 2.6 seconds on Linux, while `/api/beads` answered in 2 to 16 ms. On native Windows each of those `bd` calls takes about 60 seconds, so the four pages stay slow even after gin-console-vqc. Only the Projects page needs the `workflow` block.

## What Changes

- A new `GET /api/projects/beads` returns each configured project with `name`, `path`, `exists` and `beads`, taken from the `.beads/issues.jsonl` snapshot, and runs no command.
- The Beads page, My Tasks, Milestones and Reports load their project list from it.
- `GET /api/projects` and the Projects page are unchanged.

## User Stories

### US-1: Pages that list beads open fast
As a console user on Windows, I want the Beads page, My Tasks, Milestones and Reports to load their project list without waiting for `gin state`, so that they open in about the time the beads take to read.
REQ: REQ-SERVER-010, REQ-UI-023, REQ-UI-100, REQ-UI-102, REQ-UI-103, REQ-BEADS-013

Acceptance criteria:
- Opening any of the four pages starts no `gin` or `bd` process.
- The four pages show the same projects, in the same order, as before.
- The stale note keeps working on the Beads page and My Tasks.

## Capabilities Affected

- `server`: ADDED REQ-SERVER-010.
  - Diagram: `docs/specs/server/diagrams/project-beads-activity.md`.
- `ui`: MODIFIED REQ-UI-023, REQ-UI-100, REQ-UI-102, REQ-UI-103.
- `beads`: MODIFIED REQ-BEADS-013.
- Assets: none; the beads read path is `docs/specs/beads/diagrams/export-read-activity.md`, unchanged.

## Non-goals

- Making the Projects page or `GET /api/projects` faster.
- Changing gin-workflow so `gin state` runs no `bd`.
- A cache for the new endpoint: the snapshot already re-reads only when the file changes.

## Success Criteria

- Every scenario of the ADDED and MODIFIED REQs has a test naming its REQ.
- `uv run --directory backend pytest`, `ruff check .`, `mypy`, `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass.
- On the Tailscale deploy, opening the Beads page, My Tasks, Milestones and Reports starts no `gin state` process (TC-1).
