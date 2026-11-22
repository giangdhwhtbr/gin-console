# TC-UI-271: Progress on the Gantt row

- **REQ:** REQ-UI-130@ba81e493
- **Priority:** medium

**Preconditions:**
- Epic `e-1` has 5 tracks, 3 of them closed, and belongs to milestone `m1` of project `alpha`
- "Show closed" is off

**Steps:**
1. Open `/milestones/alpha/m1`

**Expected:**
- The second line of the Gantt row of `e-1` reads "3 of 5 done"
