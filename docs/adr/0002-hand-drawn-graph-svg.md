# Draw the dependency graph as hand-written SVG

Date: 2026-10-22
Status: proposed

## Context
The Graph view draws one epic, usually fewer than 30 nodes. The page already loads all beads and has no graph library.

## Decision
Layer nodes by longest path and draw them as SVG in React, with no new dependency. React Flow with dagre and Mermaid were rejected: the first adds about 150 KB and its own CSS to override for a feature that needs neither zoom nor dragging, and the second cannot give click selection, per-state colour or keyboard control.

## Consequences
No bundle growth and the graph follows the existing theme. No zoom, pan or edge-crossing minimisation. Adopt `@xyflow/react` when a whole-project graph or zoom is required.

## Update 2026-10-24
The dependency graph moved from a tab to a page per bead (epic gin-console-s77) and gained zoom buttons, `Ctrl` + wheel zoom and native scrolling. The hand-drawn SVG stays: epics have up to a few dozen nodes (the largest known has 52 and the longest chain 9 layers). React Flow with `dagre` is considered again for dragging nodes, a minimap or a graph of the whole project, not for zoom.
