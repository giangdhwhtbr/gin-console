# TC-UI-328: List move with Down and Up

- **REQ:** REQ-UI-046@9b0edb23
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 40c1207d

**Preconditions:**
- The List view of project `example` is shown at 1280px wide with an open epic `e-1` that has children `t-1` and `t-2`
- Focus is on the first row

**Steps:**
1. Press Down
2. Press Up

**Expected:**
- After Down focus is on the next shown row
- After Up focus is back on the first row
