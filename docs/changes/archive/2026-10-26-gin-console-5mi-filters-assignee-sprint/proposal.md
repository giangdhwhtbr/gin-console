# Filters assignee sprint

Epic: gin-console-5mi
Date: 2026-10-26

## Why
In `gin-console`, the filter bar on Board and Focus views currently includes a "Lane" dropdown that duplicates the "Label" filter (both filter on `labels` using the same label list). Meanwhile, in team mode, teams have no way to filter tasks by assignee or by sprint. To see the current sprint's status or inspect previous sprints in team workflows, users need a dedicated Sprint filter (which resolves both directly-tagged tasks and child tracks belonging to sprint epics, automatically including closed beads) and an Assignee filter.

## What Changes
- Remove the redundant "Lane" filter from `BeadFilterBar`, column handling, and URL query params.
- Add an "Assignee" select filter (`All`, `Unassigned`, and sorted unique assignees) kept in the URL query as `assignee`.
- Add a "Sprint" select filter (`All`, and sorted unique sprint names extracted from `sprint:<name>` labels) kept in the URL query as `sprint`.
- Sprint filtering matches beads carrying `sprint:<name>` directly or inheriting from a parent epic with `sprint:<name>`.
- Selecting a sprint automatically includes closed beads (`closed: true`), ensuring completed beads for current and past sprints are visible.
- Update breadcrumb filter counts and "Clear filters" to include assignee and sprint and drop lane.

## User Stories
### US-1: Filter beads by assignee
As a team member or lead, I want to filter the board, focus, and list views by assignee (including unassigned work), so that I can see the work distributed to myself or any teammate.
REQ: REQ-UI-082, REQ-UI-025

Acceptance criteria:
- The Assignee select lists "All", "Unassigned", and every unique assignee name sorted alphabetically.
- Selecting an assignee limits the displayed beads to those with matching assignee, and `assignee=<val>` is reflected in the URL.
- Selecting "Unassigned" limits the view to beads without an assignee.

### US-2: Filter beads by sprint and view past sprints
As a team member or lead, I want to filter beads by sprint, so that I can inspect the progress of the active sprint and review past sprints.
REQ: REQ-UI-083, REQ-UI-025

Acceptance criteria:
- The Sprint select lists "All" and each distinct sprint name extracted from `sprint:*` labels, sorted descending/alphabetically.
- Beads with a matching direct `sprint:<name>` label or belonging to an epic with `sprint:<name>` remain visible.
- Selecting a sprint automatically loads and displays closed beads matching that sprint without requiring manual selection of "Show closed".
- The selected sprint is persisted in the URL as `sprint=<name>`.

### US-3: Streamlined filter controls without duplicate lane filter
As a console user, I want the duplicate Lane filter removed and Clear filters to reset all active filters, so that the filter bar is clear and consistent.
REQ: REQ-UI-035, REQ-UI-036, REQ-UI-043, REQ-UI-074

Acceptance criteria:
- Lane select is removed from Board and Focus views.
- "Clear filters" resets search, status, priority, label, type, assignee, and sprint.
- Breadcrumbs count active filters including assignee and sprint, without lane.

## Capabilities Affected
- `ui`: REMOVED REQ-UI-036, MODIFIED REQ-UI-025, REQ-UI-035, REQ-UI-043, REQ-UI-074, ADDED REQ-UI-082, REQ-UI-083.

## Non-goals
- Creating, editing, or reassigning beads from the console UI (the console remains read-only).
- Server-side sprint management or modifications to `bd` CLI data formats.
- Dragging cards between assignees or sprints.

## Success Criteria
- All automated unit and component tests pass (`pnpm -C frontend test --run`).
- `gin-workflow specs lint --change gin-console-5mi` exits 0.
- Selecting Assignee and Sprint filters correctly filters all three views (Board, Focus, List) and persists across page reloads via URL query parameters.
- Completed tasks in past sprints are automatically fetched and rendered when a sprint is selected.
