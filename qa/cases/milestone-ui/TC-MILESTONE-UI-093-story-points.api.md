# TC-MILESTONE-UI-093: Story points

- **REQ:** REQ-MILESTONE-UI-008@3fdbaeb8
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` prints `days_per_point: {value: 1.4, measured_epics: 6, assumed: false}` and M1 with `velocity: {committed_points: 13, completed_points: 8, added_points: 3, say_do: 0.62, days_per_point: 1.4, planned_days_per_point: 1.2, accuracy: 0.86}`
- `milestone show M1` prints the same `days_per_point` and `velocity` and an epic with `points: 5`, `points_reason: "new endpoint and UI"`, `estimate_source: "points"`, `estimate_days: 7`, `actual_days: 6` and `actual_days_per_point: 1.2`

**Test data:**
- None

**Steps:**
1. Request `GET /api/milestones?project=P`
2. Request `GET /api/milestones/P/M1`

**Expected:**
- Both responses carry the `days_per_point` and `velocity` values unchanged
- The epic of M1 carries `points: 5`, `points_reason: "new endpoint and UI"`, `estimate_source: "points"`, `estimate_days: 7`, `actual_days: 6` and `actual_days_per_point: 1.2` unchanged
