# Tests: Project beads

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1: on the Tailscale deploy, `GET /api/projects/beads` answers in 0.05 s with the four projects and no `workflow`; after a Refresh, opening the Beads page, My Tasks, Milestones and Reports starts no `gin state`; the four pages list the same projects as before; the Projects page still shows gates | REQ-SERVER-010, REQ-UI-023, REQ-UI-100 | manual | pass, giangdhwhtbr, 2026-11-11 (Tailscale build of f29e5af) |
