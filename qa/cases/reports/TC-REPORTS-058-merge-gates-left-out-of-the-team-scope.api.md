# TC-REPORTS-058: Merge gates left out of the team scope

- **REQ:** REQ-REPORTS-009@b3daf2cc
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 9d5410dd

**Preconditions:**
- Project `alpha` has milestone `m2`
- Under `m2` there is epic `e-1` whose children are track `t-1` and merge gate `g-1` titled `external: .planning/plans/p.md#1`
- Under `m2` there is also epic `e-2` whose only child is merge gate `g-2`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha&milestone=m2`

**Expected:**
- `beads` holds `t-1` and `e-2`
- `e-2` has itself as its epic
- `beads` holds neither `e-1`, `g-1` nor `g-2`
