# TC-MILESTONE-UI-087: Output from an older gin-workflow

- **REQ:** REQ-MILESTONE-UI-008@4b68a946
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` prints schema 1 without `forecast`, `lanes`, `days_per_point` and `velocity`, and whose `milestone show M1` prints none of `lanes`, `days_per_point`, `velocity` and the epic keys `points`, `points_reason`, `estimate_source`, `actual_days` and `actual_days_per_point`

**Test data:**
- None

**Steps:**
1. Request `GET /api/milestones?project=P`
2. Request `GET /api/milestones/P/M1`

**Expected:**
- Both responses are 200
- The list has `forecast: null` and `days_per_point: null`
- The M1 entry of the list has `lanes: null` and `velocity: null`
- M1 has `lanes: null`, `days_per_point: null` and `velocity: null`
- Each epic of M1 has `points`, `points_reason`, `estimate_source`, `actual_days` and `actual_days_per_point` set to `null`
