# Milestone filter

Epic: gin-console-n6m
Date: 2026-11-12

## Why

The Beads page and My Tasks show every bead of a project at once. A member working in a milestone has to read past the beads of other milestones, and the Beads page offers a sprint filter but no milestone filter. Milestones are beads of type `milestone` with epics as children, and `GET /api/beads` neither says which milestone a bead is under nor lists closed epics by default, so the frontend cannot work it out.

## What Changes

- `GET /api/beads` adds `milestone` to each bead: the id of the nearest milestone among the bead and its ancestors, or `null`.
- A new `GET /api/beads/milestones?project=<name>` lists the project's milestones with their status and dates, and names the current one. It reads the `bd export` snapshot and starts no process. The rule for the current milestone is the one of the Team tab (REQ-REPORTS-008), moved into one shared function.
- The Beads page gets a Milestone filter, kept in the URL as `milestone`, set by default to the current milestone, with All and No milestone.
- My Tasks gets a Project filter and a Milestone filter. The Milestone filter is enabled once a project is chosen and defaults to that project's current milestone.

## User Stories

### US-1: See the beads of the current milestone
As a team member, I want the Beads page to open on the current milestone, so that I see the work of this milestone first.
REQ: REQ-BEADS-001, REQ-BEADS-015, REQ-UI-025, REQ-UI-043, REQ-UI-104

Acceptance criteria:
- Without `milestone` in the URL, the Beads page shows only the beads under the project's current milestone.
- Choosing All shows every bead; choosing No milestone shows the beads under no milestone.
- Choosing a closed milestone shows its closed beads without turning on "Show closed".
- The choice stays in the URL and applies to List, Board and Focus.

### US-2: My Tasks for one project and milestone
As a team member, I want to narrow My Tasks to one project and its current milestone, so that I see only the tasks I have to finish now.
REQ: REQ-BEADS-015, REQ-UI-105

Acceptance criteria:
- My Tasks offers a Project filter with All projects by default.
- With All projects, the Milestone filter is disabled and every matching task is listed.
- After choosing a project, the Milestone filter defaults to that project's current milestone and lists only its tasks.
- Project and milestone stay in the URL.

## Capabilities Affected

- `beads`: MODIFIED REQ-BEADS-001; ADDED REQ-BEADS-015.
  - Diagram: `docs/specs/beads/diagrams/milestone-filter-activity.md`.
- `ui`: MODIFIED REQ-UI-025, REQ-UI-043; ADDED REQ-UI-104, REQ-UI-105.
  - Use case: `docs/specs/ui/use-cases/filter-by-milestone.md`.
- `reports`: no requirement changes. REQ-REPORTS-008 keeps its text; its current-milestone rule moves into the shared function.
- Assets: none.

## Non-goals

- A milestone filter on other pages (Projects, Milestones, Reports).
- Counting the milestone filter in the breadcrumb's "· N filters" (REQ-UI-076 is unchanged).
- Editing milestones or moving beads between milestones (the console stays read-only).

## Assumptions

- The current milestone is the first match of: the `active` milestone with the earliest `start`; the open milestone whose `start` to `end` holds today; the open milestone with the earliest `start` after today. A project whose milestones are all closed, or that has none, has no current milestone, and the filter then defaults to All. Unlike the Team tab, a closed milestone is never the default, so open work is not hidden.
- A milestone bead without valid `start` and `end` dates is listed and can be chosen, but is never the current one.
- A milestone bead's own `milestone` field is its own id. The Beads page still leaves milestone beads out of its views (REQ-MILESTONE-UI-009), so this matters only to API clients.
- With a closed milestone chosen, closed beads are fetched and shown as with a named sprint (REQ-UI-083); with an open milestone chosen, "Show closed" works as before.
- If `GET /api/beads/milestones` fails, the filter says the milestones are unavailable and the list shows All.

## Success Criteria

- Every scenario of the ADDED and MODIFIED REQs has a test naming its REQ.
- `uv run --directory backend pytest`, `ruff check .`, `mypy`, `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- On the Tailscale deploy, the Beads page and My Tasks of `qwikfone` open on "Backlog Remediation — Nov 2026" and the filters behave as described (TC-1).
