# Tests: Retire Sessions and Quota

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-BEADS-018, REQ-UI-057 | Playwright on the Tailscale build | The Projects page shows "pulled … ago"; a bead page with children shows its progress bar; Beads, My Tasks, Milestones and Reports load; `/sessions`, `/sessions/alpha/s-1` and `/quota` show the Projects page with no nav link marked; no page error in the browser console. |
