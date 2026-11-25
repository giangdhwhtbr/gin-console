# TC-OVERVIEW-018: Forecast fails

- **REQ:** REQ-OVERVIEW-007@7aa72ecb
- **Priority:** high

**Preconditions:**
- Project `a` has the open milestone `m1`
- `GET /api/milestones?project=a` answers 502

**Steps:**
1. Open `/`

**Expected:**
- The line of `a` keeps its verdict
- It says "Forecast not loaded"
