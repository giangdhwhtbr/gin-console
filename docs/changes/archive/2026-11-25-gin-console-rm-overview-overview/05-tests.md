# Tests: Overview for leads

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-OVERVIEW-001 to REQ-OVERVIEW-011, REQ-UI-099, REQ-UI-073 | manual | Overview on the Tailscale build at 1440px and 360px: several projects, one unreadable project, verdicts, gates, workload, return from a bead |

## TC-1 result (2026-11-25, Tailscale build of 0c91da2, Playwright at 1440px and 360px): passed, one part not run

- Lists of 5 real projects in 0.7 s (1440px) and 1.3 s (360px). At most 4 workflow requests open. No page error, no sideways scroll (360 of 360), five nav links of 72x64px at 360px.
- Verdicts: qwikfone "At risk" with "Forecast not loaded" (its milestones request answers 502), gin-console "On track", example "Late", the other two "No open milestone".
- Gates: 13 not met; one `gin state` timed out in the 1440px run and stayed on its own line ("Could not read gates"), and all answered in the 360px run. Waivers: 0.
- Workload: one row per person across projects, Unassigned last. Blocked counts equal `GET /api/projects/beads`.
- A bead of `example` opened while `qwikfone` was current returned to `/` by the breadcrumb.
- Not run live: an unreadable project (none is configured); covered by the e2e and backend tests of REQ-OVERVIEW-001 and REQ-OVERVIEW-010.
- Seen, not a failure: the verdict word sits about 5px above the baseline of its line.
