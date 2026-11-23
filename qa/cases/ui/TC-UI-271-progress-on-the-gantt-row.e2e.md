# TC-UI-271: Progress on the Gantt row

- **REQ:** REQ-UI-130@14444aa5
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 66034af9

**Preconditions:**
- Epic `e-1` has 5 tracks, 3 of them closed, and belongs to milestone `m1` of project `alpha`
- "Show closed" is off

**Steps:**
1. Open `/milestones/alpha/m1`

**Expected:**
- The second line of the Gantt row of `e-1` shows the strand followed by "3/5"
