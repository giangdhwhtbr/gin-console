# Tests: Reports tabs

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1: on the Tailscale deploy, each tab at 1280px matches its mockup screenshot (`docs/specs/reports/assets/mockup/reports-delivery.png`, `reports-ai-usage.png`, `reports-quality.png`, `reports-data-coverage.png`), Milestones tab aside | REQ-UI-089, REQ-UI-090, REQ-UI-091, REQ-UI-092, REQ-UI-095 | manual | pass, giangdhwhtbr, 2026-11-05 (Tailscale build of ab60053) |
| TC-2: at 400px the tab list scrolls sideways, the page has no horizontal scroll, and two-column blocks stack | REQ-UI-095 | manual | pass, giangdhwhtbr, 2026-11-05 (Tailscale build of ab60053) |
| TC-3: in dark theme the headlines, chips, meters and chart colors stay readable | REQ-UI-089, REQ-UI-090, REQ-UI-095 | manual | pass, giangdhwhtbr, 2026-11-05 (Tailscale build of ab60053) |
