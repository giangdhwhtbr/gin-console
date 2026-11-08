# Tests: Milestones forecast

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1: on the Tailscale deploy with the reinstalled gin-workflow, Milestones for gin-workflow and gin-console shows the forecast card with figures matching `gin-workflow milestone list --json`, lanes and finish per row, and lanes in a milestone header, in light and dark theme | REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-017 | manual | |
| TC-2: on the Tailscale deploy, a bead whose description and notes use headings, lists, task lists, code and a table renders them as in `docs/specs/ui/assets/2026-11-08/mockup/index.html`, in light and dark theme | REQ-UI-028, REQ-UI-038 | manual | |
