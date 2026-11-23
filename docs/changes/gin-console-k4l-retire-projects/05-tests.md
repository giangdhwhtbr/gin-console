# Tests: Retire the Projects page and page project filters

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-099, REQ-UI-100, REQ-UI-055, REQ-UI-057, REQ-UI-088, REQ-UI-105, REQ-UI-124, REQ-UI-125, REQ-SERVER-004 | manual (Playwright by claude) | pass, claude (Playwright on the Tailscale build of aada06d, 52/52 checks, screenshots in qa/evidence/2026-11-23-k4l-tc1/). On the Tailscale build at 1440 and 390 px: `/` replaces itself with `/my-tasks?project=<current>`; the "Main" navigation (sidebar and bottom bar) has Beads, My Tasks, Milestones and Reports and no link to `/`; choosing a project in the switcher changes Reports and My Tasks and keeps their other query; Reports and My Tasks show no project select; `/reports?project=all` becomes `/reports?project=<current>`; an empty My Tasks list links to the Beads page; `/nope` links to Beads and My Tasks; `GET /api/projects` answers 404 and `GET /api/projects/beads` answers 200; no page error in the browser console. |
