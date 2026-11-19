# Tests: Readable UI

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-110, REQ-UI-028, REQ-UI-065, REQ-UI-109, REQ-UI-004, REQ-UI-095, REQ-MILESTONE-UI-013 | manual | On the deployed console with projects `example` and `qwikfone`: the readability check reports no overlapping text, no spill without an ellipsis and no text under 4.5:1 (3:1 large) on the Projects, Beads (List, Board, Focus, Graph), bead, My Tasks, Milestones, milestone (Gantt each zoom, Beads, Retro) and Reports (each tab) pages at 390, 1024, 1440 and 1920px in light and dark; the Gantt of `ex-m2` at 2000px has a 440px label column with the size first and no text over bars; the bead page of `ex-e3` shows the badge row, the reason line and the fact grid; screenshots at 1440×900, 2000×1100 and 390×844 |
