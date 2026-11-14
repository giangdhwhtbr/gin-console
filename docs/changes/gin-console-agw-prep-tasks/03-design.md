# Design: Prep tasks

Epic: gin-console-agw

## Architecture

The prep rule lives in one backend helper and one frontend helper. Both mirror gin-workflow `workflow_core/prep.py` `is_prep`: the labels hold `prep` and no label starts with `track:` or `req:`.

Backend:
- `backend/src/gin_console/beads/prep.py` (new, pure): `is_prep(labels) -> bool`. It returns false for labels that are not a list of strings.
- `projects/source.py` `count_beads`: drops prep tasks before it counts `open` and `in_progress`, and removes them from the `ready` and `blocked` sets of the snapshot. It sets `prep` to the number of prep tasks that are not closed. `projects/models.py` `Beads` gains `prep: int`. The `epics` list is unchanged.
- `beads/source.py` bead detail: the `children` relations carry `prep` from `is_prep` on each child's snapshot row. `beads/models.py` adds a child relation model, a `Relation` with `prep: bool`, used only by `BeadDetail.children`. `dependencies`, `dependents` and `bugs` keep `Relation`.
- `reports/service.py` `_usage`: splits an epic's children with `is_prep`. `children` and `closed_children` count tracks. The new `prep_children` and `closed_prep_children` count prep tasks. `reports/models.py` `EpicUsage` gains both fields. `_by_epic`, `own_share` and the token and cost sums are unchanged, so prep tasks still count toward the epic's usage. `ReportBead` already has `labels`.
- `reports/team.py` `_scope`: skips a prep task. An epic is skipped only when it has a child that is not a prep task.

Frontend:
- `frontend/src/features/beads/prep.ts` (new, pure): `isPrep(labels)`, the same rule, and a small "Prep" chip component next to it or in the beads feature.
- `beads/tree.ts`: a row's `totalKids` and `closedKids` count tracks. The row gains `prepKids` and `closedPrepKids`. `ListRow.tsx` shows "N/M closed" when `totalKids` is above 0, "Prep x/y" when `prepKids` is above 0, and the chip on a prep task's row.
- `beads/graph.ts` `progressOf`: leaves prep tasks out, which covers both the node count (`GraphNode.tsx`) and the heading bar (`GraphPage.tsx`). `GraphNode.tsx` shows the open icon whenever the bead has children, the "n of m done" text only when `total` is above 0, and the chip on a prep task.
- `beads/BeadDetailPage.tsx`: reads `children[].prep` from the detail. It has no labels for children, so it does not call `isPrep`. The progress bar counts children whose `prep` is false. "Prep x/y" is shown next to it. `RelationList.tsx` shows the chip for an item whose `prep` is true. `beads/api.ts` accepts `prep` on child relations.
- `milestones/gantt.ts` `childrenOf`: keeps every child, prep tasks included. `GanttChart.tsx` counts tracks for "N/M closed", adds "Prep x/y", and shows the chip on an expanded prep row.
- `reports/UsageSection.tsx`: shows `closed_children`/`children` as today and "Prep x/y" from `closed_prep_children` and `prep_children` when `prep_children` is above 0. `reports/api.ts` checks the two new fields.
- `projects/ProjectCard.tsx`: adds "prep <n>" to the counts when `beads.prep` is above 0. `projects/api.ts` checks `prep`.

Board, Focus and My Tasks are unchanged.

## Data Flow

No new endpoint and no new process. Labels already come with each bead of `GET /api/beads` (REQ-BEADS-001), so the List view, the Dependencies page and the Gantt apply `isPrep` in the browser. The server applies `is_prep` to the `bd export` snapshot for the project summaries of `GET /api/projects` and `GET /api/projects/beads`, for `children[].prep` of `GET /api/beads/{project}/{id}`, and for the AI usage and Team reports.

The Team tab flow is `docs/specs/reports/diagrams/team-tab-activity.md`. Its scope step now reads "except prep tasks and epics that have tracks". The project beads flow, `docs/specs/server/diagrams/project-beads-activity.md`, says "counts" without listing them and stays correct.

## Error Handling

- `labels` that are missing or not a list of strings make a bead a track, as in gin-workflow.
- A snapshot row with a malformed child still fails as today (REQ-BEADS-005, REQ-SERVER-007). The prep rule adds no new failure.
- The frontend shape checks require the new fields. Backend and frontend ship in one process, so an old server never answers a new client.

## Testing

Each test names its REQ in its name or a comment.
- `backend/tests/test_beads_prep.py` (new): `is_prep` with `prep`, `prep` and `prep:mockup`, `prep` and `track:x`, `prep` and `req:y`, no labels, and labels that are not a list.
- `test_collect.py` and `test_project_beads.py`: REQ-SERVER-006 "Prep tasks counted apart", through `GET /api/projects` and `GET /api/projects/beads`.
- `test_beads_api.py`: REQ-BEADS-002 "Prep child".
- `test_reports_service.py`: REQ-REPORTS-003 "epic with a prep task".
- `test_reports_team.py`: REQ-REPORTS-009 "prep tasks left out".
- Vitest: `beads/prep.test.ts`, `projects/ProjectsPage.test.tsx` (REQ-UI-004), `beads/BeadDetailPage.test.tsx` (REQ-UI-028), `beads/tree.test.ts` and `beads/ListView.test.tsx` (REQ-UI-044), `beads/graph.test.ts` and `beads/GraphPage.test.tsx` (REQ-UI-049, REQ-UI-075), `reports/sections.test.tsx` (REQ-UI-089), `milestones/gantt.test.ts` and `milestones/GanttChart.test.tsx` (REQ-MILESTONE-UI-015).
- Existing tests keep passing, because their fixtures have no `prep` label.
- Manual TC-1 on the Tailscale deploy.

## Open Technical Questions
