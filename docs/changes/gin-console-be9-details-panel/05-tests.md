# Tests: Details panel

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-045, REQ-UI-051, REQ-UI-052, REQ-UI-106 | manual | On the deployed console with the example project at 1440×900: the Beads List without `select` has no details panel and its rows span the content width; clicking a row shows the panel and narrows the list; "Close details" and Escape remove it and focus the row; Escape in the search box keeps the selection; the Graph view of `ex-m2` selects `ex-m2` with the panel, Escape twice gives `select=none` and a full-width graph that survives a reload; the project Dependencies page starts without a panel; screenshots; pass, claude (Playwright on the deployed build of 7f3f40d with the example project, 14/14 checks at 1440x900, screenshots in qa/evidence/2026-11-15-be9-tc1-run2; manual validation delegated by giangdhwhtbr 2026-11-15) |
