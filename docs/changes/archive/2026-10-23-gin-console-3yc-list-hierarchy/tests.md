# Tests: One hierarchical List view

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-044 | manual | The List on a laptop in light and dark: aligned columns, indent, chevrons, epic progress, state and type marks |
| TC-2 | REQ-UI-045 | manual | At 390px a row is two lines and a tap opens the bead page; at 1280px a click fills the panel |

## Evidence (2026-10-23)
- TC-1 and TC-2: **not run by the agent** (no browser in the session). The built branch was put on the live service (commit 3e97cfe) for the user, who then decided to close track gin-console-3yc.4 and ship. No pass or fail was recorded for these cases; the reported flow (Board with a filter, open a card, use the breadcrumb) is covered by `ReturnFlow.test.tsx`, the open branches by `ListView.test.tsx`, and the classes of the responsive columns by `ListView.test.tsx`.
