# Tests: Team reports

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1: on the Tailscale deployment, open Reports for gin-console and 30 days; `gin-console-38i` is in the epic list with `discuss` as its largest stage, the charts render in light and dark, and the navigation shows Projects, Beads, Milestones, Reports, Quota | REQ-UI-055, REQ-UI-088, REQ-UI-089 | manual | |
| TC-2: pick "All projects" and 90 days; the URL changes, each project's beads appear, and a scatter point opens its bead page | REQ-UI-088, REQ-UI-091, REQ-REPORTS-007 | manual | |
| TC-3: open `/sessions` by URL; the session list renders and no navigation link is marked current | REQ-UI-008, REQ-UI-057 | manual | |
| TC-4: at 390px width, the Reports page has no horizontal page scroll and the charts stay readable | REQ-UI-088 | manual | |
