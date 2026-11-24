# TC-REPORTS-057: Merge gates left out

- **REQ:** REQ-REPORTS-001@364d9ff4
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** a375f5b5

**Preconditions:**
- Project `alpha` has a task and a merge gate titled `external: .planning/plans/p.md#2`, both closed 3 days ago

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- The report counts the task and not the merge gate
- No section lists the merge gate
