# TC-REPORTS-016: Buckets and members

- **REQ:** REQ-REPORTS-009@45d47ef9
- **Priority:** medium

**Preconditions:**
- Project `alpha` has milestone `m2` with epic `e1`
- Epic `e1` has three child tasks: `e1.1` with status `blocked` and no assignee, `e1.2` with status `deferred` assigned to `ann`, and `e1.3` with status `in_progress` assigned to `bao`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha&milestone=m2`

**Expected:**
- The buckets of `e1.1`, `e1.2` and `e1.3` are `open`, `open` and `in_progress`
- Their members are `Unassigned`, `ann` and `bao`
