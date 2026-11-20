# Tests: Lane clusters

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-110, REQ-UI-117, REQ-UI-118 | QE | On the deployed console: `qa/e2e/readability-live.js --project example` with the Graph of `ex-e12` at 390, 1024, 1440 and 1920px in both themes reports no finding; screenshots of the Graph of `ex-e12` at 390 and 1440px in light and dark are looked at and match `docs/specs/ui/assets/2026-11-20/shots/b-*.png` (boxes in tiers, colours, headers, Waiting/Merged chips, no gate node, nothing over the bottom navigation) |
