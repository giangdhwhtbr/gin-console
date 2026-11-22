# TC-REPORTS-059: Blocked whatever the status

- **REQ:** REQ-REPORTS-010@4bd4f1af
- **Priority:** medium

**Preconditions:**
- Project `alpha` has milestone `m2` with epic `e1`
- Epic `e1` has four child tasks: `e1.1` with status `blocked`, `e1.2` open with an open blocker, `e1.3` in_progress with an open blocker, and `e1.4` in_progress without blockers

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha&milestone=m2`

**Expected:**
- `team.blocked` is 3
- `team.in_progress` is 1
- `team.open` is 3
