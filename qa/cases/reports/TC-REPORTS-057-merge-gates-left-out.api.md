# TC-REPORTS-057: Merge gates left out

- **REQ:** REQ-REPORTS-001@bfa65820
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-39-api
- **Checked:** f9ea7b91

**Preconditions:**
- Project `alpha` has a task and a merge gate titled `external: .planning/plans/p.md#2`, both closed 3 days ago

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- The report counts the task and not the merge gate
- No section lists the merge gate
