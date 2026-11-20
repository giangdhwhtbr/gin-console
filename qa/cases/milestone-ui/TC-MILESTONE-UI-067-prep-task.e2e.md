# TC-MILESTONE-UI-067: Prep task

- **REQ:** REQ-MILESTONE-UI-015@0df09dc6
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `alpha` has milestone `m2`
- Epic `e-1` has tracks `t-1` (closed) and `t-2` (open), and prep task `p-1` (closed) labelled `prep` and `prep:mockup`
- Epic `e-2` has one child only, prep task `p-2` (open) labelled `prep`

**Steps:**
1. Open `/milestones/alpha/m2`
2. Expand `e-1`
3. Expand `e-2`

**Expected:**
- The row of `e-1` shows "1/2 closed" and "Prep 1/1", and under it the rows `p-1`, `t-1` and `t-2`
- The row of `e-2` shows "Prep 0/1" and no closed count, and under it the row `p-2`
- Only the rows `p-1` and `p-2` have a "Prep" chip
