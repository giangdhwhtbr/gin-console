# TC-UI-275: Blocked count tooltip

- **REQ:** REQ-UI-132@75ded0c7
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 86f893f0

**Preconditions:**
- Project `example` has 4 blocked beads, so its Projects card reads "blocked 4"

**Steps:**
1. Open `/`
2. Move the keyboard focus to "blocked 4" with Tab
3. Press Escape

**Expected:**
- After step 2 a tooltip reads "Blocked: status blocked, or waiting on an open blocker of its own or of a parent. Prep tasks are counted apart." within 500 ms
- After step 3 the tooltip is closed
