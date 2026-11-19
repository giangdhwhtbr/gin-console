# TC-MILESTONE-UI-089: Kicked off

- **REQ:** REQ-MILESTONE-UI-021@92676633
- **Priority:** medium

**Preconditions:**
- Milestone `m1` of project `P` whose `milestone show` output has `velocity` `{committed_points: 13, completed_points: 8, added_points: 3, say_do: 0.62, days_per_point: 1.4, planned_days_per_point: 1.2, accuracy: 0.86}`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones/P/m1`

**Expected:**
- The header shows "Committed 13 pt · Completed 8 pt · Added 3 pt · Say/do 62%"
- The header shows "1.4 d/pt (planned 1.2, accuracy 0.86)"
