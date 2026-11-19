# TC-REPORTS-056: Points

- **REQ:** REQ-REPORTS-004@768a4473
- **Priority:** medium

**Preconditions:**
- An epic without `estimated_minutes` whose metadata has `points: 5`, started on a Monday and closed on the Tuesday of the next week

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- Its estimate row has `estimate_days: null` and `points: 5`
- Its estimate row has 7 actual working days and `days_per_point: 1.4`
