# TC-REPORTS-003: Estimate

- **REQ:** REQ-REPORTS-004@849689dc
- **Priority:** medium

**Preconditions:**
- An epic with `estimated_minutes` 2400 created on a Monday and closed on the Tuesday of the next week

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- It shows 5 estimated and 7 actual working days
