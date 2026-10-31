# Tests: Unassigned epics

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | case | evidence |
|---|---|---|---|---|
| TC-1 | REQ-MILESTONE-UI-010 | manual | On a real project, the "Epics not in a milestone" rows match `bd list --type epic --no-parent` (open only, then with "Show closed"); each title opens its bead page; laptop and phone, light and dark | pass 2026-10-31 (user, build c81a91b on :8701): gin-console lists 5 open (l69, le3, rm-more-harnesses, rm-web-chat, 0nj), 20 with Show closed; titles open bead pages; qwikfone shows "Every epic is in a milestone."; laptop and phone, light and dark |
| TC-2 | REQ-MILESTONE-UI-001 | manual | Phone width: each milestone row shows status, title, period, progress and warnings without overlap or word-by-word wrapping | pass 2026-10-31 (user, build c81a91b on :8701): qwikfone rows without overlap; laptop and phone, light and dark |
| TC-3 | REQ-MILESTONE-UI-003 | manual | Phone width: scrolling the Gantt keeps the bottom nav on top; no epic row or label shows over it | pass 2026-10-31 (user, build c81a91b on :8701): Gantt scrolls under the bottom nav; laptop and phone, light and dark |
