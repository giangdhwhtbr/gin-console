# Design: Unassigned epics

Epic: gin-console-l69

## Architecture
Frontend only, inside `frontend/src/features/milestones/`. No backend, API, or gin-workflow change.

- `MilestonesPage.tsx`: `MilestoneTable` drops the `unassigned_epics` sentence and renders a new `UnassignedEpics` section after the milestone list (and after the empty-milestones hint), only once the milestone list has loaded. The `unassigned_epics` field stays in `MilestoneList` and its parser, since the API still returns it.
- `UnassignedEpics.tsx` (new): owns the "Show closed" checkbox state, calls `useBeads(project, showClosed)` from `features/beads`, and renders the rows.
- A pure function `unassignedEpics(beads)` in the same file selects `issue_type === "epic" && parent === null` and sorts by priority then id; the count is the length of its result, so count and rows cannot differ.
- Rows reuse `StateMark` and `Badge` from the Beads views and link with the same `/beads/<project>/<id>` path as `ListRow` and `GanttChart`.

Why parent-less only: an epic under a milestone has the milestone as parent, and a child epic follows its parent epic into (or out of) a milestone, so listing it would double-count. This matches gin-workflow's `not parent` test without its `roadmap` label filter.

## Data Flow
1. `MilestoneTable` loads `GET /api/milestones?project=<p>` as today.
2. On success, `UnassignedEpics` mounts and `useBeads(project, showClosed)` fetches `GET /api/beads?project=<p>[&closed=1]`, refreshing every 10 s while the page is visible. `useBeads` already drops milestone beads; that does not affect the filter, which reads `parent` only.
3. Toggling "Show closed" changes the `closed` argument; `useBeads` refetches and keeps the latest answer.
4. `unassignedEpics(beads)` gives the rows; the heading shows `Epics not in a milestone (N)` with `N = rows.length`; closed rows get `text-muted-foreground`.
5. With rows, the section shows the hint `Add them with /roadmap --milestone <id>.`; without rows, `Every epic is in a milestone.`

## Error Handling
- First load: `Loading epics…` inside the section.
- Beads request fails before any data: an `Alert` with the message and a Retry button calling `useBeads`'s `retry`; the milestone list above is untouched.
- A later refresh fails: keep the last rows and show `Refresh failed: <message>` like the milestone list does.
- Milestone list fails (`MilestoneError`): the section is not rendered, as today the whole table is replaced by the error.

## Testing
Vitest in `frontend/src/features/milestones/MilestonesPage.test.tsx`, stubbing both `/api/milestones` and `/api/beads`, test names carrying the REQ-ID:
- REQ-MILESTONE-UI-010: only parent-less epics are listed (roadmap and non-roadmap; not milestone children, child epics, or tasks), titles link to bead pages, heading count equals rows; "Show closed" requests `closed=1` and lists closed epics dimmed; empty state text; beads 502 shows the error and Retry refetches while milestones stay listed.
- REQ-MILESTONE-UI-001: with `unassigned_epics: 4`, no count sentence is shown (replaces the current test).
- A unit test of `unassignedEpics` for filtering and order.

`pnpm -C frontend test --run`, `typecheck`, `lint`, and `build` must pass. A manual browser check of the section on a real project is listed in `05-tests.md`.
