# TC-MILESTONE-UI-089: Kicked off

- **REQ:** REQ-MILESTONE-UI-021@f496bedd
- **Priority:** medium

**Preconditions:**
- Milestone `m1` of project `P` whose `milestone show` output has `velocity` `{committed_points: 13, completed_points: 8, added_points: 3, say_do: 0.62, days_per_point: 1.4, planned_days_per_point: 1.2, accuracy: 0.86}`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones/P/m1`

**Expected:**
- The header shows the pairs Committed "13 pt", Completed "8 pt", Added "3 pt" and Commitment met "62%"
- The header shows the pair Days per point "1.4 (planned 1.2, accuracy 0.86)"
- Each label is in the muted color and each value in the text color with a heavier weight
