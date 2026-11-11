# Plan: Read Beads from issues.jsonl; drop bd history and reopens

Epic: gin-console-vqc
Spec: `01-proposal.md`, `02-spec-delta.md`, `03-design.md` in this folder. Diagram: `docs/specs/beads/diagrams/export-read-activity.md`.

## Objective
- **Server:** reads each project's beads from `.beads/issues.jsonl` and never starts `bd`.
  - The snapshot is kept until the file's modification time or size changes.
  - A missing file answers 502, with the `export.auto` commands in the message.
  - `/api/projects` reports `beads.stale` when the Dolt manifest changed after the last read and the file did not.
  - The reopens endpoint is gone.
- **Frontend:**
  - The bead page shows no reopens.
  - The Beads page and My Tasks show a note for each stale project.
- **README:** explains how to turn on `export.auto` per project.

Every scenario of the ADDED and MODIFIED REQs has a test naming its REQ. TC-1 in `05-tests.md` passes on the Tailscale deploy.

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
- **Problem statement:** one `bd export` takes about 60 seconds on native Windows. The console runs one per project for the Beads page, My Tasks, the Projects counts and Reports, and one `bd history` per bead page.
- **Success criteria:**
  - Everything in the Objective.
  - `uv run --directory backend pytest`, `ruff check .`, `mypy`, `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass.
  - `gin specs lint --change gin-console-vqc` prints `ok`; `gin specs trace --change gin-console-vqc` lists no missing REQ.
- **Global constraints** (from the spec and `AGENTS.md`):
  - The console never starts `bd`, never writes under `.beads`, and never edits a project's bd config. It shows commands instead.
  - `.beads/issues.jsonl` has exactly the rows `bd export` prints; parsing and checks stay as they were for `bd export`.
  - Re-read only when `(st_mtime_ns, st_size)` of the file changes; no TTL.
  - Stale means the manifest content (`.beads/embeddeddolt/*/.dolt/noms/manifest`) differs from the content read just before the file was read. No manifest means never stale.
  - `/api/beads*` responses keep their shape. `/api/projects` `beads` gains `stale: bool`.
  - Reports keep their reopens (from gin-workflow `ai_usage.quality`).
  - New and changed tests carry their REQ-ID.
  - Linux, macOS and Windows paths keep working; no new dependency.
- **Non-goals:** running `bd` to refresh a stale or missing file; editing `.beads/config.yaml`; removing `bd` from the Docker image; Reports reopens.

## Approach Options
### Option 1: read the file through the existing SnapshotStore
- **Summary:** swap the store's exporter for `read_export`, key the cache on the file's stat, and add `is_stale`. Every reader (beads, projects, reports) keeps calling `snapshots.get`.
- **Pros:**
  - One seam changes.
  - `/api/beads*` is untouched.
  - Tests inject a fake reader as they inject a fake `bd` today.
- **Cons:** test fixtures move from `bd` argv fakes to a reader fake and real files.

### Option 2: a new file store beside SnapshotStore
- **Pros:** keeps the old code path.
- **Cons:**
  - Two stores for one source.
  - The `bd` path would stay, against the decision to stop starting `bd`.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** it is the design confirmed on 2026-11-11, and the smallest change that covers every reader.

## Scope
- **In scope:**
  - `backend/src/gin_console/{app.py,beads/source.py,beads/snapshot.py,beads/router.py,beads/models.py,projects/models.py,projects/source.py}` and the backend tests that use `fake_bd.py`, `run_bd` or `export_beads`.
  - `frontend/src/features/beads/{Reopens.tsx,BeadDetailPage.tsx,api.ts,StaleNote.tsx,BeadsPage.tsx}`, `frontend/src/features/projects/api.ts`, `frontend/src/features/my-tasks/{load.ts,MyTasksPage.tsx}` and their tests.
  - `README.md`.
  - `05-tests.md`.
- **Out of scope:** `Dockerfile`, `docker-compose*.yml`, `projects/collect.py` (`gin` CLI), reports aggregation.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend), Track 2 (frontend) and Track 3 (README) share no file; Track 2 builds against the stale field from the spec with its own fixtures, so the three run together, and Track 4 is the human check after they merge.
```

## Tasks

### Track 1: Server reads issues.jsonl, reports stale, drops bd
- **Dependencies**: none
- **Requirements**: REQ-BEADS-003, REQ-BEADS-004, REQ-BEADS-005, REQ-BEADS-012, REQ-BEADS-013 (REQ-BEADS-011 removed)
- **Files**:
  - Modify `backend/src/gin_console/beads/source.py:1-64` (`read_export`, messages; delete `run_bd`, `BdRunner`, `BD_TIMEOUT`, `export_beads`) and `:189-210` (delete `count_reopens`)
  - Modify `backend/src/gin_console/beads/snapshot.py:1-140` (`export_key`, stat-keyed cache, `is_stale`; delete TTL and clock)
  - Modify `backend/src/gin_console/beads/router.py:1-110` (delete the `/reopens` route, `KeyedCache` use, `run` and `clock` parameters)
  - Modify `backend/src/gin_console/beads/models.py:66-69` (delete `Reopens`)
  - Modify `backend/src/gin_console/projects/models.py:18-24` (`stale: bool = False`)
  - Modify `backend/src/gin_console/projects/source.py:12-35` (`stale`, messages)
  - Modify `backend/src/gin_console/app.py:39-66` (`read_beads` replaces `run_bd`)
  - Modify `backend/tests/fake_bd.py` (rename the module to `backend/tests/fake_export.py`, class `FakeExport`)
  - Test `backend/tests/test_beads_api.py`
  - Test `backend/tests/test_beads_snapshot.py`
  - Test `backend/tests/test_beads_source.py`
  - Test `backend/tests/test_collect.py`
  - Test `backend/tests/test_reports_api.py`
  - Test `backend/tests/test_reports_source.py`
  - Test `backend/tests/report_beads.py`
- **Provider role**: `backend`
- **Model:** `opus`
- **Effort:** `medium`
- **Why:** one seam, but it reaches beads, projects, reports, app wiring and about 1,400 lines of tests that inject `bd`; broad context outweighs intrinsic difficulty.
- **Acceptance criteria**:
  - Every scenario of REQ-BEADS-003, 004, 005, 012, 013 has a passing test naming its REQ.
  - REQ-BEADS-011 tests are deleted, and `/api/beads/proj/a-1/reopens` answers 404.
  - `grep -rn '"bd"' backend/src` finds nothing.
  - `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
- **Estimated complexity**: medium

Interfaces produced:
```python
# beads/source.py
EXPORT_FILE = Path(".beads") / "issues.jsonl"
MISSING = (
    "{path} not found: run `bd config set export.auto true` and "
    "`bd config set export.interval 1s` in the project, then any bd write "
    "(or `bd export -o .beads/issues.jsonl`)"
)
def read_export(cwd: Path) -> list[dict[str, Any]]: ...
#   FileNotFoundError -> BeadsError(MISSING.format(path=EXPORT_FILE))
#   other OSError     -> BeadsError(f"{EXPORT_FILE} could not be read: {exc.strerror}")
#   bad JSON          -> BeadsError(f"{EXPORT_FILE} has a line that is not JSON")
#   non-object line   -> BeadsError(f"{EXPORT_FILE} has a line that is not a JSON object")
#   read with encoding="utf-8", errors="surrogateescape"; values still pass `clean` as today

# beads/snapshot.py
Reader = Callable[[Path], Any]
FileKey = tuple[int, int] | None
def export_key(cwd: Path) -> FileKey: ...                 # (st_mtime_ns, st_size) of the file; None when missing
class SnapshotStore:
    def __init__(self, read: Reader, file_key: Callable[[Path], FileKey] = export_key,
                 signature: Callable[[Path], bytes | None] = store_signature) -> None: ...
    def get(self, cwd: Path) -> Snapshot: ...            # re-reads when file_key(cwd) differs or is None
    def is_stale(self, cwd: Path) -> bool: ...           # False without a kept snapshot or without a manifest
    def clear(self) -> None: ...

# projects/models.py
class Beads(BaseModel):  # existing fields, then
    stale: bool = False

# app.py
def create_app(..., read_beads: Reader = read_export, ...) -> FastAPI: ...
```

Steps:

1. **Fake reader.** Rename `backend/tests/fake_bd.py` to `backend/tests/fake_export.py` with `git mv`. Keep `bead`, `comment`, `related`, `dep` and `export_rows`. Replace `FakeBd` with:
   ```python
   class FakeExport:
       """Stands in for `read_export`: the rows `export_rows` joins, or `failure`."""

       def __init__(self, beads=None, shown=None, up=None, comments=None,
                    failure: Exception | None = None, output: Any = None) -> None:
           ...  # same fields as FakeBd had for these names
           self.calls: list[Path] = []

       def __call__(self, cwd: Path) -> Any:
           self.calls.append(cwd)
           if self.failure is not None:
               raise self.failure
           if self.output is not None:
               return self.output
           return export_rows(self.beads, self.shown, self.up, self.comments)
   ```
   Drop `NO_ISSUE`, `ready`, `blocked`, `failing`, `bad` and `history` unless a remaining test still reads them. Check with `grep -n "FakeBd(" backend/tests`: readiness is computed from rows (`build_snapshot`), so `ready=`/`blocked=` arguments should already be unused.
2. **Source tests first** (`test_beads_source.py`): replace the `run_bd`/`export_beads` tests with `read_export` tests on `tmp_path`, each named with its REQ:
   - `test_beads_012_reads_every_row`: two rows, with a blank line between them, are returned.
   - `test_beads_005_missing_file_names_the_commands`: the message contains `.beads/issues.jsonl` and `bd config set export.auto true`.
   - `test_beads_005_line_not_json` (`{"id":`) and `test_beads_005_line_not_object` (`[1, 2]`).
   - `test_beads_005_unreadable` (a directory named `issues.jsonl`).
   Delete every `count_reopens` test.
   Run `uv run --directory backend pytest tests/test_beads_source.py`; expect `ImportError` on `read_export`.
3. **Implement `read_export`** in `source.py`:
   ```python
   def read_export(cwd: Path) -> list[dict[str, Any]]:
       """Every row of the project's `bd` export file (what `bd export` prints)."""
       path = cwd / EXPORT_FILE
       try:
           text = path.read_text(encoding="utf-8", errors="surrogateescape")
       except FileNotFoundError:
           raise BeadsError(MISSING.format(path=EXPORT_FILE)) from None
       except OSError as exc:
           raise BeadsError(f"{EXPORT_FILE} could not be read: {exc.strerror or exc}") from None
       try:
           rows = [json.loads(line) for line in text.splitlines() if line.strip()]
       except ValueError:
           raise BeadsError(f"{EXPORT_FILE} has a line that is not JSON") from None
       if not all(isinstance(row, dict) for row in rows):
           raise BeadsError(f"{EXPORT_FILE} has a line that is not a JSON object")
       return rows
   ```
   Delete `run_bd`, `BdRunner`, `BD_TIMEOUT`, `export_beads`, `count_reopens`, the `pairwise` import and the now-unused `run_json`/`run_text`/`CollectError` imports. Update the module docstring to "Beads of a project from its `.beads/issues.jsonl` snapshot; the only module that knows their JSON." Replace "bd export output was not understood" with `f"{EXPORT_FILE} was not understood"`. Run the source tests; expect pass.
4. **Snapshot tests** (`test_beads_snapshot.py`): rewrite the cache tests on real files in `tmp_path`, with a reader that counts calls. Use `os.utime(path, ns=(t, t))` to set times. Each test is named with its REQ:
   - `test_beads_012_unchanged_file_not_read_again`: same size and time, so 1 read.
   - `test_beads_012_changed_file_read_again`: a new time, or a new size at the same time, so 2 reads.
   - `test_beads_004_overlapping_reads_once`: keep the existing threaded test, now with the file reader.
   - `test_beads_004_errors_are_not_kept`: a failing reader runs again.
   - `test_beads_013_stale_when_manifest_moves`: write `.beads/embeddeddolt/db/.dolt/noms/manifest` as `root-1`, `get`, then rewrite it as `root-2`. Expect `is_stale` True. Rewrite the file with a new time, `get`, and expect False.
   - `test_beads_013_no_manifest_never_stale`.
   - `test_beads_013_not_stale_before_any_read`.
   - `test_beads_012_refresh_clears`: after `clear()`, `get` reads again.
   Delete the TTL ("No manifest" 5-second) and manifest-keyed reuse tests; their behavior is removed by MODIFIED REQ-BEADS-012. Run; expect failures.
5. **Implement the store** in `snapshot.py`:
   ```python
   def export_key(cwd: Path) -> FileKey:
       try:
           st = (cwd / ".beads" / "issues.jsonl").stat()
       except OSError:
           return None
       return (st.st_mtime_ns, st.st_size)
   ```
   - Entries become `dict[Path, tuple[FileKey, bytes | None, Snapshot]]`.
   - `get` keeps the per-project lock:
     - Compute `key = self._file_key(cwd)`.
     - Return the kept snapshot when `key is not None and hit[0] == key`.
     - Otherwise: `signature = self._signature(cwd)` (read before the file, so a write during the read shows as stale), `snapshot = build_snapshot(self._read(cwd))`, keep `(key, signature, snapshot)`.
   - `is_stale(cwd)`: under `self._guard`, take the entry. Return False when there is none or its signature is None. Otherwise return `self._signature(cwd) not in (None, hit[1])`.
   - Delete `TTL_SECONDS`, `clock` and the `time` import. Update the module docstring: "All beads of a project from its `.beads/issues.jsonl`, kept until the file changes; stale when the Dolt store changed after the file was read."
   - Run the snapshot tests; expect pass.
6. **Router and app.**
   - `beads/router.py`: delete `get_bead_reopens`, `REOPENS_TTL`, the `KeyedCache` import, `Reopens`, `count_reopens` and `BdRunner`. The signature becomes `build_router(settings: Settings, snapshots: SnapshotStore) -> APIRouter`. `failure`'s fallback text becomes `"issues.jsonl was too deeply nested"`.
   - `beads/models.py`: delete `Reopens`.
   - `app.py`: import `read_export` and `Reader`; replace the `run_bd` parameter with `read_beads: Reader = read_export`; build `SnapshotStore(read_beads)`; call `build_beads_router(settings, snapshots)`. Update the comment to "one read of .beads/issues.jsonl per project, reused until the file changes or a refresh".
7. **Projects stale.** In `projects/models.py`, add `stale: bool = False` to `Beads`. In `projects/source.py` `count_beads`, pass `stale=snapshots.is_stale(path)` and change the fallback text to `"issues.jsonl was too deeply nested"` and `f"issues.jsonl: unexpected content ({exc!r})"`.
8. **API and collect tests.**
   - In `test_beads_api.py`, `make()` passes `read_beads=fake` (`FakeExport`) instead of `run_bd=fake`.
   - Replace assertions on `call[0][0] == "export"` with `len(fake.calls)`.
   - Delete the REQ-BEADS-011 tests and `history_calls`. Add:
     - `test_beads_011_removed_reopens_404`: GET `/api/beads/proj/a-1/reopens` returns 404.
     - `test_beads_003_no_bd_process`: build the app with the default `read_export` over a real `tmp_path/proj/.beads/issues.jsonl`; `monkeypatch.setattr(subprocess, "run", <raise AssertionError>)` and the same for `subprocess.Popen`; request `/api/beads?project=proj`, a bead, its comments, `/api/projects` and `/api/reports?…` (use the params an existing reports test uses); all answer 200.
     - `test_beads_005_missing_file_502` with the default reader and no file.
   - Keep the REQ-BEADS-003 id and closed tests, with the scenario text updated to "no file outside issues.jsonl".
   - In `test_collect.py`, build the collector with `SnapshotStore(read_export)` and, in place of patching `subprocess.run` for `bd`, write `.beads/issues.jsonl` from `fakes.ISSUES` (one `json.dumps` per line). Keep the `gin` subprocess patches.
   - Add:
     - `test_beads_005_projects_block_error` (no file: `beads` is a `BlockError` naming the file).
     - `test_beads_013_projects_stale` (manifest changed after the read: `beads.stale` True).
   - In `test_reports_api.py`, `test_reports_source.py` and `report_beads.py`, switch `run_bd=` to `read_beads=` with `FakeExport`; per-project runners become `read_beads=lambda cwd: readers[cwd.name](cwd)`.
9. Run:
   ```bash
   uv run --directory backend pytest
   uv run --directory backend ruff check .
   uv run --directory backend mypy
   grep -rn '"bd"' backend/src
   ```
   Expect all pass and no `grep` output.
10. Commit: `git commit -m "feat(beads): read .beads/issues.jsonl, report stale exports, drop bd history (gin-console-vqc)"`

### Track 2: Bead page without reopens; stale notes
- **Dependencies**: none
- **Requirements**: REQ-UI-086, REQ-UI-087, REQ-UI-103
- **Files**:
  - Delete `frontend/src/features/beads/Reopens.tsx`
  - Modify `frontend/src/features/beads/BeadDetailPage.tsx:15,150-165` (drop `Reopens`)
  - Modify `frontend/src/features/beads/api.ts:128-140` (delete `fetchReopens`)
  - Create `frontend/src/features/beads/StaleNote.tsx`
  - Modify `frontend/src/features/beads/BeadsPage.tsx:11-60` (keep stale names from the projects it fetches; render `StaleNote`)
  - Modify `frontend/src/features/projects/api.ts:9-60` (`stale?: boolean` and its guard)
  - Modify `frontend/src/features/my-tasks/load.ts` (`stale: string[]` in `MyTasks`)
  - Modify `frontend/src/features/my-tasks/MyTasksPage.tsx` (render `StaleNote`)
  - Test `frontend/src/features/beads/BeadDetailPage.test.tsx`
  - Test `frontend/src/features/beads/api.test.ts`
  - Test `frontend/src/features/beads/BeadsPage.test.tsx`
  - Test `frontend/src/features/beads/StaleNote.test.tsx`
  - Create `frontend/src/features/projects/api.test.ts` (guard tests for `stale`)
  - Test `frontend/src/features/my-tasks/load.test.ts`
  - Test `frontend/src/features/my-tasks/MyTasksPage.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a deletion and one small presentational component wired into two pages, with the scenarios written out.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-086, 087, 103 has a passing test naming its REQ.
  - No source file references `fetchReopens` or `/reopens`.
  - `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass.
- **Estimated complexity**: low

Interfaces produced:
```ts
// features/beads/StaleNote.tsx
export function StaleNote({ projects }: { projects: readonly string[] }): JSX.Element | null; // null when empty
// features/projects/api.ts
export type Beads = { open: number; in_progress: number; blocked: number; ready: number;
  epics: { id: string; title: string }[]; stale?: boolean };
export function isStale(project: Project): boolean; // beads is a Beads with stale === true
// features/my-tasks/load.ts
export type MyTasks = { tasks: MyTask[]; failures: ProjectFailure[]; stale: string[] };
```

Steps:

1. **Reopens out.**
   - In `BeadDetailPage.test.tsx`, delete the reopens tests ("Reopened N times", loading, "Reopens unavailable", late answer).
   - Add `REQ-UI-086 the bead page requests no reopens`: render a bead with a stubbed fetch, wait for the title, and assert no fetched URL ends with `/reopens` and `screen.queryByText(/Reopen/)` is null.
   - Keep the "Bugs found" tests (REQ-UI-086).
   - Keep the color test for the heading, renamed `REQ-UI-087 the Bugs found heading uses the bug color` and without the "Reopened" assertion.
   - In `api.test.ts`, delete the `fetchReopens` test.
   - Delete `Reopens.tsx`, its import and `<Reopens …/>` in `BeadDetailPage.tsx` (keep the " · " separators of the remaining items), and `fetchReopens` in `api.ts`.
   - Run `pnpm -C frontend test --run src/features/beads`; expect pass.
2. **Projects type.**
   - In `features/projects/api.ts`, add `stale?: boolean` to `Beads`. Make the guard accept a missing key or a boolean and refuse other types.
   - Add `export const isStale = (p: Project) => p.beads !== null && !("error" in p.beads) && p.beads.stale === true;` (narrow with the existing `isBlockError` if the guard style requires it).
   - Create `features/projects/api.test.ts` with guard tests through `fetchProjects` and a stubbed fetch: a missing `stale` passes; `stale: "yes"` rejects (REQ-UI-103).
3. **StaleNote.**
   - `StaleNote.test.tsx` (REQ-UI-103):
     - With `["alpha"]`, a note reads "Beads of alpha may be out of date. Run `bd export -o .beads/issues.jsonl` in alpha.", with the command in a `<code>`.
     - With `["a", "b"]`, two notes.
     - With `[]`, nothing renders.
   - Implement it with `Alert` (default variant, not destructive), keyed by project name:
     ```tsx
     export function StaleNote({ projects }: { projects: readonly string[] }) {
       if (projects.length === 0) return null;
       return (
         <div className="flex flex-col gap-2">
           {projects.map((name) => (
             <Alert key={name}>
               <AlertDescription>
                 Beads of {name} may be out of date. Run <code>bd export -o .beads/issues.jsonl</code> in {name}.
               </AlertDescription>
             </Alert>
           ))}
         </div>
       );
     }
     ```
4. **Beads page.**
   - `BeadsPage.tsx` already fetches projects. Extend the `ok` state to `{ status: "ok"; names: string[]; stale: string[] }`, with `stale` from `list.filter((p) => p.exists && isStale(p)).map((p) => p.name)`.
   - Render `<StaleNote projects={stale.includes(selected) ? [selected] : []} />` above the list.
   - Tests in `BeadsPage.test.tsx`:
     - `REQ-UI-103 note for the selected stale project`: alpha stale, so the note names alpha.
     - `REQ-UI-103 no note when not stale`: the `stale` key is missing.
5. **My Tasks.**
   - `load.ts`: keep the project list, set `stale` to the names of existing projects with `isStale`, and return it.
   - `MyTasksPage.tsx`: render `<StaleNote projects={data.stale} />` above the table when ok.
   - Tests:
     - `load.test.ts` `REQ-UI-103 lists stale projects`.
     - `MyTasksPage.test.tsx` `REQ-UI-103 one note per stale project`: A stale, B not; one note naming A; tasks of both listed.
6. Run `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`; expect all pass. Then `grep -rn "fetchReopens\|/reopens" frontend/src` gives no output.
7. Commit: `git commit -m "feat(ui): drop reopens from the bead page, show stale export notes (gin-console-vqc)"`

### Track 3: README: turn on the beads export
- **Dependencies**: none
- **Requirements**: none (documents REQ-BEADS-005)
- **Files**:
  - Modify `README.md` (a `## Beads export` section after `## Listening on all interfaces`; one line in Prerequisites)
- **Provider role**: `docs`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** documentation with the exact commands below, checked against `backend/src/gin_console/beads/source.py`.
- **Acceptance criteria**:
  - The section and the Prerequisites line are present.
  - The commands match `MISSING` in `beads/source.py` after Track 1.
  - No em or en dashes, no bold-label list items.
- **Estimated complexity**: low

Steps:

1. Add `## Beads export` with:
   - Opening: gin-console reads each project's beads from `.beads/issues.jsonl`, which `bd` keeps up to date when its auto export is on; the console never runs `bd`.
   - Commands, run once in each project directory (the same in bash, PowerShell and cmd):
     ```bash
     bd config set export.auto true
     bd config set export.interval 1s
     bd export -o .beads/issues.jsonl
     ```
     These write `export.auto` and `export.interval` to the project's `.beads/config.yaml`. The last command writes the file now; afterwards every bd write updates it.
   - Without the file, the Beads page and My Tasks show an error for that project naming these commands.
   - Stale note: bd skips an export that comes less than `export.interval` after the previous one. The console then shows "may be out of date". `bd export -o .beads/issues.jsonl`, or the next bd write after the interval, brings it up to date.
   - The bead page no longer shows a reopen count.
2. In Prerequisites, change the `bd` line (or add one) to say `bd` is needed to write the export file, not by the console at runtime.
3. Check: `grep -n "export.auto\|issues.jsonl" README.md` shows the section; `grep -nP "[\x{2013}\x{2014}]" README.md` shows no dashes in the added lines.
4. Commit: `git commit -m "docs(readme): turn on the beads export file (gin-console-vqc)"`

### Track 4: Turn on export.auto and check on the Tailscale deploy
- **Dependencies**: Track 1, Track 2, Track 3
- **Requirements**: REQ-BEADS-003, REQ-BEADS-005, REQ-BEADS-013, REQ-UI-086, REQ-UI-103
- **Files**:
  - Modify `docs/changes/gin-console-vqc-beads-jsonl/05-tests.md` (TC-1 row and result)
- **Provider role**: `general`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** run the recorded commands and record the user's result; no code.
- **Human gate**: the user approves running `bd config set export.auto true`, `bd config set export.interval 1s` and `bd export -o .beads/issues.jsonl` in each configured project on the server (`~/.config/gin-console/config.yaml`), then walks TC-1 on `https://instance-20260515-2304.tail5ca54e.ts.net:8443` and reports pass or fail.
- **Acceptance criteria**: TC-1 recorded `pass, giangdhwhtbr, <date> (Tailscale build of <commit>)`.
- **Estimated complexity**: low

Steps:

1. With the user's approval, for each project path in `~/.config/gin-console/config.yaml` that has a `.beads` directory, run the three commands of Track 3 in that directory and check that `.beads/issues.jsonl` exists.
2. Deploy as the deploy memory records, each a separate command:
   - `git -C /home/gin/gin-fam/gin-console merge --ff-only feat/gin-console-vqc-beads-jsonl` (on the checked-out spec branch).
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`.
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`.
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`.
   - `systemctl --user restart gin-console`.
   - `systemctl --user is-active gin-console`.
   - `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health`, which should answer `200`. Retry for up to 12 seconds while the service starts.
   - Report the rollback command.
3. Ask the user to walk TC-1 and write the result into `05-tests.md`.

TC-1 (manual, REQ-BEADS-003, 005, 013, REQ-UI-086, 103):
- The Beads page, My Tasks and Projects load for every project.
- `pgrep -fa "bd export"` and `pgrep -fa "bd history"` stay empty while the user clicks through the Beads page, a bead page, My Tasks and Reports.
- The bead page shows no "Reopened" text.
- Run `bd update <a bead> --notes x` twice within one second. After 5 seconds, a reload of the Beads page shows the stale note for that project. `bd export -o .beads/issues.jsonl` and a reload clear the note.

## Integration
- **Branch**: `feat/gin-console-vqc-beads-jsonl`, created from `spec/gin-console-vqc-beads-jsonl` after the spec and plan commit. Tracks 1–3 work on their own track branches and merge into it; Track 4 runs on it after those merges.
- **Merge strategy**: parallel-then-merge

## Validation
- [ ] `uv run --directory backend pytest`, `ruff check .`, `mypy` pass
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass
- [ ] `gin specs lint --change gin-console-vqc` prints `ok`; `gin specs trace --change gin-console-vqc` lists no missing REQ
- [ ] TC-1 passes on the Tailscale deploy

## Notes
- `Model:` and `Effort:` come from the main harness catalog (`haiku`, `sonnet`, `opus`; `low` to `max`) using the route rubric. The user may override them before plan approval.
- The Parent Bead (`gin-console-vqc`) stays open until the human-confirmed merge. Each track bead closes when its tests and review pass.
- At ship, the Beads memory `bd-history-json-prints-snapshots-newest-first-and` is obsolete (`bd forget bd-history-json-prints-snapshots-newest-first-and`).
- Without the export file, a project shows an error after deploy. That is why Track 4 turns on `export.auto` before the restart.
