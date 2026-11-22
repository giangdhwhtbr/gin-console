# TC-MILESTONE-UI-104: Merge gate and lane

- **REQ:** REQ-MILESTONE-UI-015@0df09dc6
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-57-11
- **Checked:** a3b13abd

**Preconditions:**
- Milestone `M1` of project `P` has epic `e-1` with track `t-1` in lane `be` (open) and merge gate `g-1` (open) whose parent is `e-1`

**Steps:**
1. Open `/milestones/P/M1`
2. Click the expand button of `e-1`

**Expected:**
- Before expanding, the row of `e-1` shows "0 of 1 done"
- After expanding, the only child row is `t-1` with the lane chip "be"
- `g-1` has no row
