# Design: Quality signals

Epic: gin-console-le3

## Architecture
A change to the `beads` context only, backend and frontend. No gin-workflow change, no new config key, no background task, nothing written to disk or to Beads.

Backend (`backend/src/gin_console/beads/`):
- `models.py`: `Relation.type` accepts `discovered-from` as well; `BeadDetail` gains `bugs: list[Relation] = []`; new `Reopens` model with `reopens: int`.
- `source.py`: `get_bead` already runs `bd dep list --direction up --json -- <id>`; `_relations` keeps rows of type `discovered-from` too, and `bugs` takes those whose `issue_type` is `bug` (`dependents` and `children` keep filtering by `blocks` and `parent-child`, so a bug never shows there). New `count_reopens(run, cwd, bead_id) -> int` runs `bd history --json -- <id>`, reverses the snapshots (bd prints newest first), and counts adjacent pairs `closed` then not `closed`, the rule of gin-workflow's `quality()` (`workflow_core/usage.py:145`). A snapshot list that is not a list of objects with a string `Issue.status` raises `BeadsError` (502); `null` (what bd prints, with exit 0, for an unknown id) or an empty list raises `BeadNotFound` (404).
- `router.py`: `GET /beads/{project}/{bead_id}/reopens` checks the project and id as the comments route does, takes the bead's `updated_at` from the existing 5 s detail cache (`details.get`, which the page has just filled, so usually no `bd` call), then reads a `KeyedCache` keyed by `(project, id, updated_at)` with a 1-day TTL. A changed bead gets a new key, so `bd history` runs again; an unchanged one is answered from memory. `KeyedCache` already gives one fetch per key at a time and keeps no error.

Frontend (`frontend/src/features/beads/`):
- `api.ts`: `Relation.type` adds `"discovered-from"`, `BeadDetail` adds `bugs`, and a parser for `{"reopens": number}`.
- A `useReopens(project, id)` hook shaped like the comments hook: loads after the bead is shown, ignores an answer for a bead no longer shown, exposes `retry`.
- `BeadDetailPage.tsx` (also rendered in the List detail panel): `RelationList title="Bugs found"` after "Blocks" (it renders nothing for an empty list), and `Reopened N time(s)` appended to the metadata line when N > 0. On failure, a small inline `Reopens unavailable: <error>` with a Retry button under the metadata line.

Why a separate endpoint and not a field of the detail: `bd history` takes 0.44 s per bead on gin-console and about 0.9 s, printing 1.4 MB of JSON, for a bead of gin-workflow, and the detail refreshes every 10 s; a separate request keeps the page fast and isolates its failure, as the comments request does.

## Data Flow
1. The page loads `GET /api/beads/<p>/<id>` as today; the answer now includes `bugs`, and the page lists them under "Bugs found".
2. Once the bead is shown, the page requests `GET /api/beads/<p>/<id>/reopens`.
3. The server reads `updated_at` from the detail cache (or runs `bd show` and `bd dep list` if it expired), then returns the cached count for `(p, id, updated_at)` or runs `bd history` and stores it.
4. The page shows `Reopened N times` when N > 0, nothing when 0 or still loading.

## Error Handling
- Unknown project, unsafe id, or unknown bead: 404, no `bd` command for an unsafe id (REQ-BEADS-003).
- `bd history` missing, timing out after 30 s, failing, or answering an unexpected shape: 502 with `error` (REQ-BEADS-005), not cached.
- Frontend: a failed reopens request shows `Reopens unavailable` with the error and a Retry button; the rest of the page is unaffected. Never 0 for an unknown count.

## Testing
- pytest (`backend/tests/test_beads*.py`), with `FakeBd` taught to answer `history` (and to fail it): REQ-BEADS-011 scenarios (count with duplicate snapshots, zero, unchanged bead served from memory past 5 s via the injected clock, changed `updated_at` reruns, 404s and unsafe id, 502 not kept); REQ-BEADS-002 "Bugs found" (open and closed bugs listed, epic left out, neither in `dependents`).
- vitest (`BeadDetailPage.test.tsx`): REQ-UI-086 scenarios (bugs listed and linked, no section when empty, "Reopened 2 times", "Reopened 1 time", nothing for 0 or while loading, failure with Retry while fields stay, late answer ignored).
- `uv run --directory backend pytest`, `ruff check`, `mypy`, and `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` must pass. A manual check on a real bead is listed in `05-tests.md`.
