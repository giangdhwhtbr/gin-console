# Tests: Project health

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-SERVER-005, REQ-SERVER-006, REQ-UI-003, REQ-UI-004 | manual | On the deployed console: the qwikfone card shows "workspace · 8 repos" and "Show repos" lists the 8 repos with branch and shape; an epic in progress on a card shows its stage from `gin state --workflow-id`, matching the CLI; ready epics show "ready"; no default-workflow gate chips remain; a project without workspace, team, warnings or waivers shows none of them; screenshots at 1440×900 and 390×844 |
