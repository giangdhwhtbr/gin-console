# TC-MILESTONE-UI-085: Remaining and assumed days

- **REQ:** REQ-MILESTONE-UI-013@50a2ef46
- **Priority:** medium

**Preconditions:**
- Milestone `M1` of project `P` with an in-progress epic A with `estimate_days: 5` and `remaining_days: 2`, and an open epic B without an estimate and with `assumed_days: 3`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones/P/M1`

**Expected:**
- A's second line reads "2d left"
- B's second line reads "assumed 3d"
