# Tests: Ui polish

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-107, REQ-UI-044, REQ-UI-048, REQ-UI-049, REQ-UI-065, REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-013, REQ-REPORTS-012 | manual | On the deployed console with the example project, the long-text sweep (`qa/evidence/2026-11-15-long-text/long-text-sweep.js` with the Graph view URLs) at 1440×900 and 390×844 finds no page overflow, no offscreen text, no squeezed item and no ellipsis without `title` on any page; the List row of the long-id epic shows its control, shortened id and title; the Graph view of `ex-m2` places the unlinked epics in rows of 3; a milestone without dates (added to a copy of the example project) shows "No dates" and its error while the others list normally; desktop and mobile screenshots |
