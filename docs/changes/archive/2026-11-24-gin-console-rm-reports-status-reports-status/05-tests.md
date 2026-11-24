# Tests: Reports status

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-REPORTS-020, REQ-REPORTS-022, REQ-REPORTS-024, REQ-REPORTS-025, REQ-REPORTS-027, REQ-REPORTS-028, REQ-REPORTS-031, REQ-REPORTS-033, REQ-REPORTS-036, REQ-UI-095, REQ-UI-129 | Playwright on the Tailscale build | At 1440px and 390px on the example project: `/reports` opens `/reports/status` for `ex-m2`; the Status section shows the verdict with its sentence, five figures with change lines, a burn-up whose scope steps up after kickoff, changes of kinds added, re-estimated and bug, a blocked chain and an unestimated epic in Risks, and the epic table with planned and forecast dates; the sidebar (1440px) and the row of links (390px) list Status, Team, Delivery, Velocity and Rework with headlines; picking "Last 30 days" on Delivery keeps it on Team, Velocity and Status; `/reports?tab=quality&days=7` becomes `/reports/rework?days=7`; the Team section shows Points delivered, Estimate accuracy, the unassigned note and Across milestones; no page scrolls sideways; no page error. Result: pass, claude (Playwright on the Tailscale build of d17e6a6, 38/38 checks, screenshots in qa/evidence/2026-11-24-reports-status-tc1/) |
