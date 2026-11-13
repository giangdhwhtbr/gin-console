# TC-REPORTS-044: Epic not yet split into tasks

- **REQ:** REQ-REPORTS-009@45d47ef9
- **Priority:** high

**Preconditions:**
- Project `alpha` has milestone `m2`
- Under milestone `m2` there are epics `e2`, `e3` and `e4`, none with child beads, all assigned to `ann`
- Under milestone `m2` there is also epic `e5`, whose only child is task `e5.1`, closed and assigned to `ann`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha&milestone=m2`

**Expected:**
- `beads` holds `e2`, `e3`, `e4` and `e5.1`
- Each of `e2`, `e3` and `e4` has itself as its epic
- `e5` is not in `beads`
- The row of `ann` has scope 4 and closed 1
