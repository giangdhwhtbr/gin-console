# Dependency tree

Epic: gin-console-rm-beads-native
Date: 2026-10-22

## Why
Scotty can show how beads depend on each other; the console cannot, so Scotty is still needed to answer "what blocks this" and "what does finishing this unlock". The owner prefers the clean, collapsible tree of `bv` over Scotty's node graph. This is change D of five under the epic (A browse, B Board and Focus and C comments and authors are shipped; D dependency tree; E retire Scotty).

## What Changes
- The bead list rows carry `blocked_by` (the ids of the beads that block a bead), read from the dependencies `bd list` already prints.
- The Beads page gets a **Tree** view beside List, Board and Focus, in two modes: Hierarchy (epic, task, subtask) and Blocking (what finishing a bead unlocks). Branches open and close; search, filters and lane narrow the tree.
- Clicking a node selects it (kept in the URL) and shows the full bead, with comments, in a panel beside the tree; the tree can be used with the keyboard as a standard tree.

## User Stories
### US-1: See how beads are organised
As the console owner, I want a collapsible tree of a project's beads grouped by parent, so that I can see epics, tasks and subtasks and how far each epic has got.
REQ: REQ-UI-030, REQ-UI-041, REQ-UI-044

Acceptance criteria:
- The Tree view lists root beads and opens their children branch by branch, each node showing its state.

### US-2: See what blocks what
As the console owner, I want to see which beads block which, so that I know what to finish first and what finishing a bead unlocks.
REQ: REQ-BEADS-010, REQ-UI-042

Acceptance criteria:
- In Blocking mode a bead's children are the beads it blocks; a bead blocked from several places is shown at each without making the tree loop or grow without bound.

### US-3: Narrow the tree and read a bead from it
As the console owner, I want to filter the tree and click a node to read the bead beside it, so that I do not lose my place.
REQ: REQ-UI-043, REQ-UI-045

Acceptance criteria:
- Search and filters keep only matching nodes with their ancestors; clicking a node shows the bead in a panel and puts it in the URL.

### US-4: Use the tree without a mouse
As the console owner, I want to move through the tree with the keyboard, so that I can read it quickly and with assistive tools.
REQ: REQ-UI-046

Acceptance criteria:
- Arrow keys move, open and close nodes and Enter selects; the tree exposes the standard tree roles.

## Capabilities Affected
- `beads`: ADDED REQ-BEADS-010.
- `ui`: MODIFIED REQ-UI-030; ADDED REQ-UI-041..046.

## Non-goals
Drawing nodes and edges as a graph, dragging, editing dependencies, the `related`, `discovered-from` and `supersedes` relations, several projects in one tree, a tree for a single bead inside the bead page, retiring Scotty (change E).

## Success Criteria
All scenarios have tests; on the live host `/beads?project=qwikfone&view=tree` shows the epics with their children and, in Blocking mode, the beads that unlock others; clicking a node shows the bead and its comments beside the tree, and a reload restores the selection.
