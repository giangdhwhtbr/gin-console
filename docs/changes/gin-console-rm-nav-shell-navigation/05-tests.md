# Tests: Navigation shell

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-123, REQ-UI-124, REQ-UI-125, REQ-UI-126, REQ-UI-127, REQ-UI-128, REQ-UI-129, REQ-UI-057, REQ-UI-063, REQ-UI-072 | Playwright on the Tailscale build | Choosing a project carries it to Milestones and Reports, and a starred favorite opens in a new tab; a bead opened from a milestone shows "<milestone title> › …" with the titles, Milestones marked and the tab titled `<bead title> · <project> · gin-console`; `/nope` and `/quota` show "Page not found"; `/beads?project=zzz` shows the unknown-project notice; Back from a bead restores the List scroll position and focuses the row; Tab then Enter skips to the content; at 1440px the report sections are in the sidebar and at 900px in the tab list; no page error. |
