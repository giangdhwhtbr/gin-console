# Tests: Remove AI usage from Reports

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-REPORTS-001, REQ-REPORTS-005, REQ-REPORTS-019, REQ-UI-088, REQ-UI-091, REQ-UI-093, REQ-UI-095, REQ-UI-129 | Playwright on the Tailscale build | At 1440px and 390px: the Reports tabs and the sidebar sections read Team, Delivery, Velocity and Quality, with no AI usage or Data coverage and no tokens or cost anywhere; `tab=coverage` opens Team; the Quality tab shows the rework rate, reopens, bugs found later and the member and epic tables for `example` (generated reopens and bugs) and for qwikfone (real reopens); a project made to fail shows a warning above the tabs on two different tabs; no page error. |
