# Design: Project card health from gin state

Epic: gin-console-5ox

## Architecture

- **Backend models (`backend/src/gin_console/projects/models.py`)**
  - `Workflow` keeps its fields `stage`, `layout` and `gates`. It gains:
    - `workspace: Workspace | None = None`, where `Workspace = {root: str, repos: list[WorkspaceRepo]}` and `WorkspaceRepo = {path, branch: str | None, shape: str | None, frozen: bool, present: bool}`;
    - `team: Team | None = None`, where `Team = {enabled: bool, host: str | None, me: str | None}`;
    - `decision: str | None = None`;
    - `warnings: list[str] = []`;
    - `remedies: list[str] = []`;
    - `review_waivers: list[ReviewWaiver] = []`, where `ReviewWaiver = {task_id, reason, actor}`.
  - `Epic` gains `status: str` and `workflow: EpicWorkflow | BlockError | None = None`, where `EpicWorkflow = {stage, gates, warnings, review_waivers}`.
- **Backend collection (`projects/collect.py`)**
  - `collect_workflow` maps the new keys. Missing or malformed optional keys fall back to `None` or `[]`, and the workflow block does not fail because of them. `warnings` and `remedies` keep only their string entries.
  - `collect_epic_workflow(path, epic_id)` runs `gin state --workflow-id <id> --format json` with `json_on_failure=True`, as the default state does, because a finished workflow exits 1. It returns an `EpicWorkflow` or a `BlockError`.
  - In `Collector.get`, after the beads summary, the in-progress epics of `beads.epics` get `workflow` from `collect_epic_workflow`. These calls run through a `ThreadPoolExecutor(max_workers=4)` per project, and the result is cached with the project result (5 s, REQ-SERVER-008).
  - `GET /api/projects/beads` (REQ-SERVER-010) uses the beads reader only, so its epics carry `status` but no `workflow`, and it starts no process.
- **Beads summary (`projects/source.py`)**: each epic in the summary carries `status`.
- **Frontend (`frontend/src/features/projects/`)**
  - `api.ts`: types and shape checks for the new fields. Missing keys read as `null` or `[]`, so an older backend still works.
  - `ProjectCard.tsx`:
    - `WorkflowBlock` is replaced by `HealthBlock`, which shows:
      - "workspace · <n> repos" with a "Show repos" disclosure listing `path`, `branch` and `shape`, marking "frozen" or "missing" repos;
      - "team · <host>";
      - an alert (`role="alert"`) with "hold", the warnings and the remedies;
      - "<n> review waiver(s)" with a list of task, reason and actor.
      
      The default workflow's stage and gate chips go away.
    - `BeadsBlock` epics:
      - An in-progress epic shows a stage `Badge`. A `⚠ <n>` mark counts its warnings plus its waivers; its details show in a `title` and in a visually hidden list for screen readers.
      - An error shows "stage unknown", with the error in `title`.
      - A ready epic shows "ready".

## Data Flow

See `docs/specs/server/diagrams/project-health-activity.md`.

## Error Handling

- **The default `gin state` fails:** the `workflow` block is `{error}`, as before (REQ-SERVER-007). The epic stages are still collected.
- **One epic's `gin state` fails or times out:** only that epic's `workflow` is `{error}`. The per-call timeout is the existing one.
- **Malformed optional keys:** they are ignored, and the defaults apply.

## Testing

- **pytest** with the fake `gin` in `backend/tests/fakes.py`, extended to answer `--workflow-id`:
  - Workspace, team and health are carried, including the "Older gin" output without the new keys (REQ-SERVER-005).
  - The stage of an in-progress epic is carried. No call is made for a ready epic. One epic failing does not affect the others (REQ-SERVER-006).
  - `GET /api/projects/beads` makes no `gin` call and its epics have no `workflow` (REQ-SERVER-006, REQ-SERVER-010).
  - At most four `gin state` calls run at once, checked with a fake that counts concurrent calls.
- **vitest:**
  - `ProjectsPage.test.tsx` covers the REQ-UI-003 scenarios (workspace and team, health alert, plain project) and the REQ-UI-004 scenario (stage per epic).
  - An "stage unknown" case.
  - `api.test.ts` covers the shape defaults.
- **TC-1:** Playwright on the deployed console. qwikfone has a workspace and epics in progress; gin-console has none at rest.

## Open Technical Questions
