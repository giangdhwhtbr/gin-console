# Beads graph

Epic: gin-console-61l
Date: 2026-10-22

## Why
Dependencies between tasks are invisible in the console: a card shows only "N deps", and the user must open each bead and read its relations to learn what blocks what. An epic's execution order cannot be seen at a glance.

## What Changes
A fifth Beads view, **Graph**, draws one epic as a layered dependency graph: its child tasks (recursively through `parent`) as nodes, `blocked_by` as arrows from blocker to blocked task, laid out left to right so ready work sits on the left. Selecting a node highlights its blocking chain and opens its details beside the graph. No backend change: the graph is built in the browser from the beads the page already loads. The SVG is hand-drawn and layered by longest path, with no new dependency (ADR 0002).

## User Stories

### US-1: See an epic's dependencies
As a developer, I want the tasks of an epic drawn with arrows from blockers to the tasks they block, so that I can see the order of work and what is stuck.
REQ: REQ-UI-047, REQ-UI-048, REQ-UI-049, REQ-UI-050

Acceptance criteria:
- The Graph tab lists epics when none is chosen and draws the chosen epic's tasks in layers.
- A blocker outside the epic is shown dimmed with a dashed border.
- A dependency cycle does not freeze the page and is announced.

### US-2: Trace a task's chain
As a developer, I want to select a task and see everything that blocks it and everything it blocks, so that I can find the critical path.
REQ: REQ-UI-051, REQ-UI-052

Acceptance criteria:
- Selecting a node highlights its blockers and blocked tasks and dims the rest.
- The task's details open beside the graph.
- The arrow keys follow the edges and Esc clears the selection.

### US-3: Reach the graph from an epic
As a developer, I want a link from an epic's page to its graph, so that I do not have to pick it again.
REQ: REQ-UI-053

Acceptance criteria:
- An epic's bead page links to `/beads?project=<p>&view=graph&select=<id>`.

### US-4: Read the graph without colour
As a developer using a screen reader or with colour blindness, I want each state shown as an icon and a word and the edges listed as text, so that the graph is usable.
REQ: REQ-UI-054

Acceptance criteria:
- Every node shows an icon and a text label for its state.
- A visually hidden list states each "X is blocked by Y".

## Capabilities Affected
`ui` (Views modified; Graph requirements added).

## Non-goals
Zoom and pan, dragging nodes, a whole-project graph, backend changes, and the wider visual redesign (palette, shell, dark-mode toggle), which is a separate change.

## Success Criteria
A user opens an epic's graph and, without opening any bead, names the tasks that are ready, the ones blocked and by what. `pnpm typecheck`, `lint`, `test --run` and `build` pass.
