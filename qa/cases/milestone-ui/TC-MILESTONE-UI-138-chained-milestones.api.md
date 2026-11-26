# TC-MILESTONE-UI-138: Chained milestones

- **REQ:** REQ-MILESTONE-UI-008@4b68a946
- **Priority:** medium

**Preconditions:**
- Project `P` whose `forecast.milestones` holds `{id: M2, start: 2026-11-26, finish: 2027-07-02, overflow_days: 150}` and `{id: M4, start: null, finish: null, overflow_days: 0}`

**Test data:**
- None

**Steps:**
1. Request `GET /api/milestones?project=P`

**Expected:**
- The response is 200
- `forecast.milestones` holds both entries unchanged
