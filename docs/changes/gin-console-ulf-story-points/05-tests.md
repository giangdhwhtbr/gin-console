# Tests: Story points and velocity KPIs

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-013, REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-021, REQ-REPORTS-018, REQ-UI-090, REQ-UI-095, REQ-UI-109 | manual | On the deployed console with the example project regenerated with story points: the Gantt of `ex-m2` shows "<p> pt · <n>d" for pointed epics; an epic's List row shows "<complexity> · <p> pt" and its bead page "Points <p>" with the reason; the Milestones list shows "Say/do <n>%" for kicked-off milestones and "–" otherwise, and the forecast card "<x> days per point"; the milestone page of a kicked-off milestone shows the velocity line; Reports › Velocity shows the figures, both charts and the table, matching `gin milestone list --all --json`; Reports › Delivery shows a pointed epic as "<p> pt" with "<x> d/pt"; screenshots at 1440×900 and 390×844 |
