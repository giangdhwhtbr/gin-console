# TC-REPORTS-052: Milestones with velocity

- **REQ:** REQ-REPORTS-018@d6b9d106
- **Priority:** medium

**Preconditions:**
- Project `alpha` whose milestones list has `days_per_point` `{value: 1.4, measured_epics: 6, assumed: false}`
- Closed milestone `m1` (start 1 Oct) with `velocity` `{committed_points: 10, completed_points: 8, added_points: 0, say_do: 0.8, days_per_point: 1.5, planned_days_per_point: 1.2, accuracy: 0.8}`
- Active milestone `m2` (start 3 Nov) with `velocity` `{committed_points: 13, completed_points: 5, added_points: 2, say_do: 0.38, days_per_point: 1.3, planned_days_per_point: 1.4, accuracy: 1.08}`
- Planned milestone `m3` with `velocity` `{committed_points: null, completed_points: 0, added_points: 0, say_do: null, days_per_point: null, planned_days_per_point: null, accuracy: null}`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports?project=alpha&tab=velocity`

**Expected:**
- The figures read "1.4 d/pt", "38%" and "1.08"
- The charts and the table hold `m1` then `m2`
- `m3` is not shown
