# TC-UI-275: Blocked count tooltip

- **REQ:** REQ-UI-132@a6b1922c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** b58dd319

**Preconditions:**
- Project `example` has 4 blocked beads, so the Blocked column of its Board holds 4

**Steps:**
1. Open `/beads?project=example&view=board`
2. Rest the pointer on the count of the Blocked column
3. Press Escape

**Expected:**
- After step 2 a tooltip reads "Blocked: status blocked, or waiting on an open blocker of its own or of a parent. Prep tasks are counted apart. Counted in this column." within 500 ms
- After step 3 the tooltip is closed
