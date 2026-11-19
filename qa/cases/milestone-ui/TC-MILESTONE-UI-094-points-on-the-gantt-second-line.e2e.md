# TC-MILESTONE-UI-094: Points on the Gantt second line

- **REQ:** REQ-MILESTONE-UI-013@50a2ef46
- **Priority:** medium

**Preconditions:**
- Milestone `M1` of project `P` with an open epic C with `points: 5` and `estimate_days: 7`, and an in-progress epic D with `points: 3`, `estimate_days: 4` and `remaining_days: 1`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones/P/M1`

**Expected:**
- C's second line reads "5 pt · 7d"
- D's second line reads "3 pt · 1d left"
