# Design: Project beads

Epic: gin-console-plp

## Architecture

- Backend, `backend/src/gin_console/projects/`:
  - `models.py`: `class ProjectBeads(BaseModel): name: str; path: str; exists: bool; beads: Beads | BlockError | None`.
  - `source.py`: `build_project_beads(entry: ProjectEntry, snapshots: SnapshotStore) -> ProjectBeads`. It checks `entry.path.is_dir()` and, when the directory exists, calls the existing `count_beads(snapshots, entry.path)`.
  - `router.py`: `@router.get("/projects/beads") def get_project_beads() -> list[ProjectBeads]`, declared before nothing that would shadow it (`/projects` is exact), returning `[build_project_beads(e, snapshots) for e in settings.projects]`.
  - The route is serial: each project costs a `stat`, plus a parse when the file changed. It does not use `Collector` (no `gin`, no 5-second reuse).
- Frontend:
  - `features/projects/api.ts`:
    - `type ProjectBeads = { name: string; path: string; exists: boolean; beads: Beads | BlockError | null }`.
    - `fetchProjectBeads(): Promise<ProjectBeads[]>` with a guard built from the existing `isProject` pieces (no `workflow`).
    - `isStale` takes `Pick<Project, "beads">`, so it accepts both shapes.
  - `features/beads/BeadsPage.tsx`, `features/my-tasks/load.ts`, `features/milestones/MilestonesPage.tsx`, `features/reports/ReportsPage.tsx`: `fetchProjects` becomes `fetchProjectBeads`, with types following. The Projects page keeps `fetchProjects`.

## Data Flow

Project beads: `docs/specs/server/diagrams/project-beads-activity.md`. The read path is unchanged: `docs/specs/beads/diagrams/export-read-activity.md`. `GET /api/projects/beads` calls `SnapshotStore.get` and `is_stale` per existing project, like the `beads` block of `GET /api/projects`, without `gin state`.

## Error Handling

- A project whose beads cannot be read gets `beads: {"error": …}` from `count_beads`; the others still answer (REQ-SERVER-007 behavior).
- A failed request is handled by each page as it handles a failed `fetchProjects` today.

## Testing

- Backend (`backend/tests/test_app.py` or a new `test_project_beads.py`), each named with REQ-SERVER-010:
  - Summary per project, using the existing `write_export` helper.
  - No process: `subprocess.run` and `subprocess.Popen` patched to fail.
  - Unreadable beads.
  - No projects.
- Backend: REQ-BEADS-013 "Project beads without reuse".
- Frontend:
  - `projects/api.test.ts` covers `fetchProjectBeads` parsing and rejection.
  - The page tests of Beads, My Tasks, Milestones and Reports stub `/api/projects/beads` instead of `/api/projects`.
  - REQ-UI-023 and REQ-UI-100 "Not the full projects list": no request to `/api/projects`.
- QA: `gin-qa cases` for REQ-SERVER-010 and the MODIFIED REQs; the pins of the existing TC-UI-005..007 and TC-BEADS-015..018 are re-pinned.

## Open Technical Questions
