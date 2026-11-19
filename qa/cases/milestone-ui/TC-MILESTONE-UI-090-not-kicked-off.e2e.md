# TC-MILESTONE-UI-090: Not kicked off

- **REQ:** REQ-MILESTONE-UI-021@92676633
- **Priority:** medium

**Preconditions:**
- Milestone `m2` of project `P` whose `milestone show` output has `velocity` with `committed_points: null`, `completed_points: 0`, `say_do: null` and `days_per_point: null`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones/P/m2`

**Expected:**
- The header shows "Not kicked off · Completed 0 pt"
- The header shows no "d/pt"
