# Tests: Milestone beads views

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-MILESTONE-UI-018, REQ-MILESTONE-UI-002, REQ-UI-106, REQ-UI-072, REQ-UI-073, REQ-UI-081 | manual | On the deployed console with the example project: the milestone page `ex-m2` has the tabs Gantt and Beads; the Beads tab shows only `ex-m2` beads in List, Board, Focus and Graph without a Milestone select, the view and filters stay in the URL across a reload, and changing tab keeps `start` and `zoom`; `?tab=graph` opens the Graph view; the Graph view draws the epics of `ex-m2` with outside beads dashed, an assignee filter drops the epics without that assignee, selecting a node shows the details panel, opening `ex-e4` draws its tasks with a breadcrumb back, and opening a task opens its bead page whose breadcrumb returns to the Beads tab with the same view and filters; the Beads page has the Graph view and no "Dependencies" link; desktop and mobile screenshots |
