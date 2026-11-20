# TC-REPORTS-057: Merge gates left out

- **REQ:** REQ-REPORTS-001@a4d0c5b4
- **Priority:** high

**Preconditions:**
- Project `alpha` has a task and a merge gate titled `external: .planning/plans/p.md#2`, both closed 3 days ago

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- The report counts the task and not the merge gate
- The merge gate is not listed without `ai_usage`
