# Tests: Epic page

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-110, REQ-UI-119, REQ-UI-120, REQ-UI-121 | QE | On the deployed console: `qa/e2e/readability-live.js --project example` with the epic page tabs of `ex-e12` and `ex-e3` (Overview, Graph, Lanes, Discussion) at 390, 1024, 1440 and 1920px in both themes reports no finding; screenshots of the Overview and Graph tabs of `ex-e12` at 390 and 1440px in light and dark are looked at and match `docs/specs/ui/assets/2026-11-21/epic-page/shots/` (cards, lanes rows, tracks table, nothing cut without an ellipsis, nothing over the bottom navigation); `/beads/example/ex-e12/graph` lands on the Graph tab |
