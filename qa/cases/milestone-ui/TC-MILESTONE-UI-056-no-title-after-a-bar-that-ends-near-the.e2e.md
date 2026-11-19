# TC-MILESTONE-UI-056: No title after a bar that ends near the chart edge
REQ: REQ-MILESTONE-UI-013@50a2ef46
Priority: low
Result: passed
Run: qa/evidence/2026-11-15T14-02-27

Preconditions:
- epic Z whose bar ends on the last day of the plan shown as `Whole milestone`

Steps:
1. Open /milestones/P/M1

Expected:
- Z's title is not shown after its bar
