# Tests: Milestone filter

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-104, REQ-UI-105 | manual | On the Tailscale deploy: `/beads?project=qwikfone` opens with Milestone "Backlog Remediation — Nov 2026" and only its beads in List, Board and Focus; All and No milestone work; `/my-tasks` has All projects with Milestone disabled, and choosing `qwikfone` selects the same milestone and lists only its tasks |
