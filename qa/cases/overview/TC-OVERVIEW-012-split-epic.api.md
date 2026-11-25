# TC-OVERVIEW-012: Split epic

- **REQ:** REQ-OVERVIEW-004@3bf39e85
- **Priority:** medium

**Preconditions:**
- Ready epic `e-1` without an assignee, whose ready track `e-1.1` has no assignee

**Steps:**
1. Request `GET /api/overview`

**Expected:**
- `e-1.1` is in `unassigned` and `e-1` is not
