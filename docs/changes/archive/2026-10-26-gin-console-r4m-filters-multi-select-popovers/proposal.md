# Filters multi select popovers

Epic: gin-console-r4m
Date: 2026-10-26

## Why
Users currently have basic single-select filter dropdowns for Status, Priority, Label, Type, Assignee, and Sprint. When managing complex boards, users need to filter by multiple statuses (e.g. open AND in-progress), multiple priorities (e.g. P0 AND P1), multiple assignees, or multiple labels (with Any or All matching). On mobile screens, individual dropdowns clutter the header and make filtering difficult.

## What Changes
1. **Multi-Select Filters**: Status, Priority, Assignee, and Labels become multi-select filters supporting multiple simultaneous values.
2. **URL Query Serialization**: Multi-select values serialize as comma-separated query parameters (e.g., `status=open,in_progress&priority=0,1`).
3. **Labels Filter & Matching**: Excludes `sprint:*` labels and provides an Any/All toggle switch (default: Any; `label_mode=all` in URL when All).
4. **Sprint Filter Refinements**: Hidden when no `sprint:*` labels exist in loaded beads; provides a "No sprint" option (`sprint=none`) when sprints exist.
5. **Responsive Layout**: On desktop (`md+`), filters render as button triggers with active count tags opening `@base-ui/react` popovers. On mobile (`< md`), a single "Filters" button opens a bottom sheet drawer.

## User Stories

### US-1: Multi-select status, priority, and assignee filters
As a board user, I want to select multiple statuses, priorities, and assignees at the same time, so that I can focus on specific subsets of active work.
REQ: REQ-UI-025, REQ-UI-082

Acceptance criteria:
- Selecting multiple statuses shows beads matching any of the chosen statuses.
- Selecting multiple priorities shows beads matching any of the chosen priorities.
- Selecting multiple assignees (or "Unassigned") shows beads matching any of the chosen assignees.
- Comma-separated query parameters in the URL restore multi-select filters on page reload.

### US-2: Multi-select labels filter with Any/All matching
As a board user, I want to filter by multiple labels with an Any or All switch, so that I can easily discover related or cross-tagged work.
REQ: REQ-UI-085

Acceptance criteria:
- The Labels filter popover lists unique labels from loaded beads while excluding `sprint:*` labels.
- When "Any" is selected (default), beads matching at least one selected label are shown.
- When "All" is selected, only beads matching every selected label are shown, and `label_mode=all` is stored in the URL.

### US-3: Sprint filter refinements
As a board user, I want the Sprint filter to hide when not applicable and offer a "No sprint" option, so that projects without sprints are uncluttered and unsprinted tasks can be found.
REQ: REQ-UI-083

Acceptance criteria:
- The Sprint control is hidden when loaded beads have no `sprint:*` labels.
- When sprints exist, options include "All", "No sprint", and each unique sprint name.
- Selecting "No sprint" displays beads that lack both direct and parent epic `sprint:*` labels (`sprint=none`).

### US-4: Responsive popovers and mobile sheet
As a user on a laptop or mobile phone, I want compact popovers on desktop and a single sheet on mobile, so that the filter bar is intuitive and responsive across screen sizes.
REQ: REQ-UI-084

Acceptance criteria:
- On desktop viewports (>= 768px), each filter renders as an individual button trigger with active count badge opening a popover.
- On mobile viewports (< 768px), a single "Filters" button opens a bottom sheet with all filter controls and a Clear button.

## Capabilities Affected
- `ui`: bead filtering logic, URL query sync, filter bar components, and view integration.

## Non-goals
- Backend filtering API changes (all filtering remains client-side).
- Multi-select for Type or Sprint (both remain single-select).
- Re-architecting view rendering performance beyond standard React state.

## Success Criteria
- All automated unit tests in `filters.test.ts` pass with full multi-value and URL coverage.
- Component and integration tests pass for `BeadFilterBar`, `ListView`, and `BoardView`.
- Build, lint, and typecheck pass cleanly with zero warnings or errors.
