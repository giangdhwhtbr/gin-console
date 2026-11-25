# Design: My work

Epic: gin-console-rm-my-work

## Architecture

Frontend only (`frontend/src`); the backend and its endpoints stay as they are. Three pure modules hold the rules so that the components only render:

- `features/my-tasks/groups.ts`: `groupWork(beads, email)` returns the groups of REQ-UI-150 from the beads of the current project. It uses `samePerson` (`lib/people.ts`), `stateOf` (`features/beads/graph.ts`), `isPrep` (`features/beads/prep.ts`) and `withoutMergeGates` (`features/beads/mergeGates.ts`). `features/my-tasks/load.ts` keeps its requests; the sort stays `compareTasks`.
- `features/beads/nextCommand.ts`: `nextCommand(bead, email, stage)` returns the command text or `null` (REQ-BEADS-025). The stage is the one of the epic's workflow; a non-epic ignores it.
- `features/beads/blockers.ts`: `openBlockers(detail)` (the open `blocks` dependencies of a bead, by id, for the header) and `firstBlocker(bead, beadsById)` (the title from loaded beads, else the id, for cards and rows).

Components:
- `features/my-tasks/MyTasksPage.tsx` renders `MyWorkGroup` sections; a group is a `<table>` from `md` and a card list below it (Tailwind `md:` classes, no JS). The page, its `rememberOrigin` key and its address stay.
- The label "My Tasks" becomes "My work" in `app/Layout.tsx` (sidebar), `app/NotFoundPage.tsx`, `features/beads/Breadcrumb.tsx`, and the page heading and title of `MyTasksPage.tsx`.
- `features/beads/BeadHeader.tsx` gains `stage?: string | null` (epic pages pass the loaded workflow stage, every other caller omits it) and renders "Next" with `CopyCommand` (`features/milestones/CopyCommand.tsx`, reused as is) and "Blocked by" links above "View in graph". `EpicPage` lifts the `fetchEpicWorkflow` request from `WorkflowCard` so that one request serves both.
- `features/beads/BeadCard.tsx` shows "Blocked by <title>" from `firstBlocker` with the beads the view has already loaded.
- `features/jump/JumpPalette.tsx` is mounted once in `app/Layout.tsx`, which knows the configured projects and runs when Refresh data finishes (`onRefreshed`); the palette listens for Ctrl+K and Cmd+K, loads the beads of those projects on its first opening, keeps them in memory until then, and drops them when Refresh data finishes. It uses the base-ui dialog (`@base-ui/react/dialog`) for focus and Escape.

Rules of the change: no request carries the email; a bead's group is decided in one function and in no component.

## Data Flow

- My work: [My work activity](docs/specs/ui/diagrams/my-tasks-activity.md) (use case: [Pick the next work](docs/specs/ui/use-cases/pick-next-work.md)).
- Next command: [Next command activity](docs/specs/beads/diagrams/next-command-activity.md).
- Jump palette: [Jump palette activity](docs/specs/ui/diagrams/jump-palette-activity.md) (use case: [Jump to a bead](docs/specs/ui/use-cases/jump-to-a-bead.md)).

## Error Handling

- A project or beads request that fails on My work shows the same error as today (REQ-UI-102) and no groups.
- The epic workflow request that fails or is still loading: the header shows no command and no error; the Workflow card of the Overview tab shows its own error as today.
- A blocked bead whose blockers are not in the data: the header shows its Blocked state without names (REQ-UI-152); a card falls back to the blocker's id.
- The palette names each project whose beads request fails and keeps the others searchable; a failure is asked again on the next opening after "Refresh data".
- The clipboard is missing or refuses: `CopyCommand` already keeps the command on screen.

## Testing

- `vitest`: `groups.test.ts` (each group, the empty case, prep, deferred, epics), `nextCommand.test.ts` (one test per row of REQ-BEADS-025), `blockers.test.ts`, `MyTasksPage.test.tsx` (groups, labels, closed group, empty message, failures), `BeadHeader.test.tsx` (command, blockers, none), `EpicPage.test.tsx` (stage command after loading), `BeadCard.test.tsx` (blocker line), `JumpPalette.test.tsx` (keys, results order, 20 limit, one project failing, cache and refresh), `App.test.tsx` (the new labels, the title and the breadcrumb).
- QA track (Quality line of the roadmap): gin-qa cases and Playwright specs for My work, the bead header, the palette, the phone layout at 390px and the copy of a command, each naming its REQ.
- `backend`: no test changes.

## Open Technical Questions
