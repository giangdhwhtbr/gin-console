# Lanes view

Epic: gin-console-9ix
Kind: capability
Date: 2026-11-19

## Why

gin-workflow's team mode now delivers one member's tracks of an epic as a lane: the tracks run one after another on one branch `feat/<topic>-<lane>` and ship in one pull request (gin-workflow-ifbt, merged into gin-workflow master as 17743a82). Each track bead carries the label `lane:<name>` and the line `Lane: <name>`, team members hold a lane through a lease in `metadata.claim`, and a track that needs another lane's merged code is blocked by a placeholder bead titled `external: <plan path>#<N>` that `gin team deps` closes when that pull request merges.

The console's Graph view answers "what blocks what". With lanes the questions are "who runs which tracks, in what order, how far is each lane, and which lane waits for another lane to merge". Today a lane shows nowhere but as a raw `lane:` label chip in the List, and the placeholder bead looks like a task, ready on the Board.

No configured project runs team mode yet, so no real epic with lanes exists. User decisions 2026-11-19:
- Build and check against an epic with lanes added to the example project.
- Derive a lane's state from Beads only; pull request state (open, approved, merged) stays out.
- Show the claim lease in the lane header.
- Draw lanes as rows on shared dependency columns with arrows in the gaps and a merge marker on each arrow through a placeholder.
- Show a lane chip on track beads in every view; hide placeholder beads ("merge gates") from the work views, and show them in the Graph, the Lanes view, the bead page and the Dependencies of the track they block.

## What Changes

- Bead list and detail: `lane`, `track`, `claim` and `waits_for` per bead; a bead with `waits_for` is a merge gate, never ready and left out of the project counts and the reports.
- Beads views: a "Lanes" view of an epic with lanes, offered next to Graph: one row per lane with a sticky header (name, state, holder, lease, closed/total), cards on columns shared by every lane in dependency order, arrows in the gaps, a Waiting/Merged marker on each arrow through a merge gate, keyboard and a screen reader list.
- A lane chip on List rows, Board and Focus cards, Graph nodes, Gantt child rows and the bead page; Lane, Track and Lease facts on the bead page.
- Merge gates: hidden from List, Board, Focus, My Tasks and the Gantt child rows and from every child count; a node of their own in the Graph; readable words on their bead page and in Dependencies.
- Example project: an epic with four lanes, a "No lane" row and two merge gates.

## User Stories

### US-1: See an epic's lanes
As a team lead, I want one row per lane of an epic with its holder, lease, progress and state, so that I can see who runs which tracks and how far each lane is.
REQ: REQ-UI-111, REQ-UI-112, REQ-UI-114, REQ-UI-030, REQ-BEADS-019, REQ-UI-110

Acceptance criteria:
- The Lanes view of the example epic `ex-e12` shows the rows `be`, `fe`, `infra`, `qa` and "No lane", each track as a card in dependency order.
- The `be` header reads Running, held by `ann`, a lease until a future date and "1/2 closed"; the `infra` header reads Idle with "Lease expired".
- The Lanes tab is not offered for an epic without lanes.

### US-2: See which lane waits for which merge
As a team lead, I want an arrow from the track a lane waits for to the waiting track, marked Waiting or Merged, so that I can see which pull request holds a lane back.
REQ: REQ-UI-113, REQ-UI-112, REQ-BEADS-019

Acceptance criteria:
- In `ex-e12`, an arrow runs from `be` track 2 to `qa` track 4 with the marker "Waiting", and from `fe` track 3 to `qa` track 4 with the marker "Merged".
- The `qa` header reads "Waiting for be".
- No arrow or marker crosses a card or a header.

### US-3: Recognize a track's lane anywhere
As a team member, I want a track's lane on its row, card, node and page, so that I know whose lane a bead belongs to without opening the Lanes view.
REQ: REQ-UI-115

Acceptance criteria:
- A `be` track shows the chip "be" in the List, on the Board, in the Graph and on its Gantt child row, and its bead page shows the facts Lane, Track and Lease.
- No label chip repeats `lane:be` or `track:2`.

### US-4: Merge gates are not work
As a team member, I want merge gates kept out of the work lists and counts, so that the Board and the reports show only work someone does.
REQ: REQ-UI-116, REQ-BEADS-007, REQ-SERVER-006, REQ-REPORTS-001, REQ-REPORTS-009, REQ-MILESTONE-UI-015

Acceptance criteria:
- An open merge gate is not in the Ready column, not in the List, Focus or My Tasks, not in the project's ready count and not a child row on the Gantt.
- In the Graph it is a dashed node reading "Waits for be #2 to merge" with the state Waiting.

## Capabilities Affected

- `beads`: ADDED REQ-BEADS-019; MODIFIED REQ-BEADS-007.
  - Diagram: `docs/specs/beads/diagrams/lane-fields-activity.md`.
- `ui`: ADDED REQ-UI-111, REQ-UI-112, REQ-UI-113, REQ-UI-114, REQ-UI-115, REQ-UI-116; MODIFIED REQ-UI-030, REQ-UI-110.
  - Diagrams: `docs/specs/ui/diagrams/lanes-view-activity.md`, `docs/specs/ui/diagrams/lane-state.md`.
  - Use case: `docs/specs/ui/use-cases/follow-epic-lanes.md`.
- `server`: MODIFIED REQ-SERVER-006.
- `reports`: MODIFIED REQ-REPORTS-001, REQ-REPORTS-009.
- `milestone-ui`: MODIFIED REQ-MILESTONE-UI-015.
- Assets: none.

## Assumptions

- "Merge gate" is the console's name for gin-workflow's `external: <plan path>#<N>` placeholder bead; gin-workflow fixes only its title, so the console recognizes it by the title alone, whatever its type, labels or parent.
- A merge gate is matched to the track it waits for among the scope epic's children by plan path and track number; when a track has no `Plan:` line, by its `track:<N>` label when exactly one child has that number.
- A lane's holder is the set of assignees of its tracks that are not closed; they can differ after a reassign.
- "Now" for a lease is the browser's clock when the view renders; the view re-renders on each 10 s refresh.
- The "<n> lanes" count of the milestone page (REQ-MILESTONE-UI-017) comes from `gin milestone` and is not changed.
- A lane epic in a real team project will be checked when one exists; it does not hold back ship.

## Non-goals

- Pull request state of a lane (open, approved, merged, "delivered"); a later cross-repo epic in gin-harness if needed.
- Lanes of a project or a milestone scope; the Lanes view is per epic.
- Changes to the Graph layout, other than the look of a merge gate node.
- Any action on lanes (claim, hand off, release): the console stays read-only.
- Changes to gin-workflow.

## Success Criteria

- Every scenario of the ADDED and MODIFIED requirements has an automated test that carries its REQ-ID.
- TC-1 passes on the deployed console: the readability check reports no finding on the Lanes view of `ex-e12` and the Beads views of `example` at 390, 1024, 1440 and 1920px in both themes, with screenshots.
