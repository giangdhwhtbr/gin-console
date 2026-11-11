# Design: Beads jsonl

Epic: gin-console-vqc

## Architecture

One `SnapshotStore` (`backend/src/gin_console/app.py:52`) already serves the Beads API, the Projects `beads` summary and Reports. Only its source and its cache key change.

- `beads/source.py`:
  - `read_export(cwd: Path) -> list[Any]` reads `cwd/.beads/issues.jsonl` and parses each non-empty line as a JSON object, with the same parsing and checks that `run_bd(["export"])` applied to stdout.
  - Raises `BeadsError` with the REQ-BEADS-005 messages: a missing file, an unreadable file, a line that is not a JSON object.
  - Removed: `run_bd`, `BdRunner`, `BD_TIMEOUT`, `export_beads`, `count_reopens`.
- `beads/snapshot.py`:
  - `SnapshotStore(read, file_key=export_key, signature=store_signature)`. `export_key(cwd)` returns `(st_mtime_ns, st_size)` of the file, or `None` when it is missing.
  - The cache entry holds `(file_key, manifest signature at read, snapshot)`.
  - `get(cwd)` re-reads when `file_key` differs, so the TTL and clock go.
  - `is_stale(cwd) -> bool`: true when the current manifest signature is not `None` and differs from the one kept with the snapshot.
  - The manifest signature is read before the file, so a write during the read shows as stale rather than being missed.
- `beads/router.py`: drop the `/reopens` route and the `run` parameter.
- `beads/models.py`: drop the reopens model.
- `projects/models.py`: `Beads.stale: bool = False`.
- `projects/source.py` `count_beads`: sets `stale` from `snapshots.is_stale(path)`.
- `app.py`: drop the `run_bd` parameter of `create_app`; build the store with `read_export`.
- Frontend:
  - Remove `features/beads/Reopens.tsx`, `fetchReopens` and its use in `BeadDetailPage.tsx`.
  - `features/projects/api.ts`: `Beads.stale?: boolean`, with the guard accepting a missing key.
  - New `features/beads/StaleNote.tsx`: `StaleNote({ projects }: { projects: readonly string[] })` renders one note per name.
  - `BeadsPage` and `MyTasksPage` keep the projects they already fetch and pass the stale names.
- `README.md`: a "Beads export" section with `bd config set export.auto true` and `bd config set export.interval 1s` per project (PowerShell the same), the note that `bd export -o .beads/issues.jsonl` refreshes it by hand, and that the console reads no other bd data.

## Data Flow

Export read and staleness: `docs/specs/beads/diagrams/export-read-activity.md`.

The frontend sees no change in `/api/beads*` responses. `/api/projects` gains `beads.stale`. `bd` keeps the file current: with `export.auto: true` and `export.interval: 1s`, every bd write rewrites it, except a write within 1 second of the previous export. That case is what `stale` reports.

## Error Handling

- Missing file: `BeadsError` → 502 on `/api/beads*`; `{"error": …}` beads block on `/api/projects` (existing per-block handling).
- Unreadable file (`OSError`) or bad line: `BeadsError` → 502; nothing kept, so the next request reads again.
- Manifest unreadable: signature `None`, so never stale (as `store_signature` does today).

## Testing

- Backend, with fixture files under `tmp_path/.beads/issues.jsonl` in place of `fake_bd.py`; each test names its REQ:
  - `test_beads_source.py`: parse, missing file message, bad line, wrong-typed bead left out (REQ-BEADS-005).
  - `test_beads_snapshot.py`:
    - one read for list, detail and comments; overlapping requests; errors not kept (REQ-BEADS-004);
    - unchanged mtime and size not re-read; changed re-read (REQ-BEADS-012);
    - stale or fresh, catch-up, no manifest (REQ-BEADS-013).
  - `test_beads_api.py`: the `/reopens` route answers 404 (REQ-BEADS-011 removed); no `bd` process across all views, via a `subprocess.run` spy (REQ-BEADS-003); refresh (REQ-BEADS-012).
  - `test_projects*`: `beads.stale` and the error block (REQ-BEADS-013, REQ-BEADS-005).
- Frontend: StaleNote on the Beads page and My Tasks (REQ-UI-103); the bead page requests no `/reopens` (REQ-UI-086); the "Bugs found" color (REQ-UI-087); the removed Reopens tests are deleted.

## Open Technical Questions
