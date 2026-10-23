# Bead cards and discussion on beads

Epic: gin-console-8yg
Date: 2026-10-23

## Why
Feedback after using the live console: a bead card says nothing at a glance (its state is only the column it sits in, the type is a grey outline, and "0 comments" and "N deps" are printed in grey on every card even when they are zero); the graph node already has a state edge, icon and label but the Board and Focus cards look unrelated; and the comments of a bead sit at the bottom of its page, faded, so they are easy to miss.

## What Changes
- One card language for Board, Focus, List and Tree rows: the state as an icon, a word and a coloured left edge (shared with the graph node), the type as a coloured pill (epic purple, bug red, feature pink), and comment and dependency indicators that only appear when the count is above 0, the comment one stronger.
- The colour of In progress moves from indigo to blue, so that an epic in progress is not shown in two near hues.
- The bead page gets a Discussion area: a sticky side column from 1024px with a Hide/Show control that is remembered; tabs "Details | Discussion (n)" under 1024px and in the embedded details panel; each comment is a block of its own, with the text in the normal text colour.
- No backend change and no new dependency.

Design reference: https://claude.ai/artifact/WTC31iQ9PznEVjY79rAYgG (private; the Bead page and Beads content boards show the direction, the exact colours are in `design.md`).

## User Stories

### US-1: Read a card at a glance
As a developer scanning a board, I want each card to show its state, its type and whether it has discussion or dependencies, so that I do not have to open it to know.
REQ: REQ-UI-064, REQ-UI-065, REQ-UI-066, REQ-UI-067

Acceptance criteria:
- A card shows the state as an icon and a word and a coloured left edge.
- The type is a pill with its name; epic, bug and feature have their own colour.
- A comment icon with a count appears only when the bead has comments; a dependency icon only when it has dependencies.
- No card says "0 comments" or "0 deps".

### US-2: See the same bead the same way everywhere
As a developer, I want the card, the list row, the tree row and the graph node to use the same state mark, so that the console feels like one tool.
REQ: REQ-UI-064, REQ-UI-065

Acceptance criteria:
- The state icon, name and colour on the Board, the Focus view, the list, the tree and the graph are the same.

### US-3: Read the discussion beside the bead
As a developer reviewing a bead, I want its comments next to its details, so that I can read both at once.
REQ: REQ-UI-068, REQ-UI-069, REQ-UI-071, REQ-UI-039, REQ-UI-040

Acceptance criteria:
- On a window 1024px or wider the bead page has the details on the left and the discussion in a sticky column on the right.
- Under 1024px, and in the details panel of the Tree and Graph views, there are tabs "Details" and "Discussion (n)".
- Each comment is its own block with the author in bold, the time muted and the text in the normal colour.
- A bead without comments shows neither the column nor the tab.

### US-4: Get the discussion out of the way
As a developer who only wants the fields, I want to hide the discussion and have the console remember it, so that I do not have to hide it on every bead.
REQ: REQ-UI-070

Acceptance criteria:
- A Hide discussion button collapses the column; a Show discussion (n) button brings it back.
- The choice is kept for the next bead and the next visit.
- If the browser refuses to store it, the button still works for the visit.

## Capabilities Affected
`ui`: four requirements modified (REQ-UI-031, 039, 040, 059), eight added.

## Non-goals
Writing or editing comments, markdown or avatars in comments, unread markers, the bug and reopen indicators (epic gin-console-le3, which reuses the indicator of this change), the "View dependencies" button and the per-bead graph (epic gin-console-s77), merging the List and Tree views (epic gin-console-3yc), the Beads filters (epic gin-console-r4m).

## Success Criteria
A card shows its state, type, comments and dependencies without opening it; an epic in progress shows blue state and purple type, not two close hues; the comments of a bead can be read beside its fields on a laptop and one tap away on a phone. `pnpm typecheck`, `lint`, `test --run` and `build` pass.
