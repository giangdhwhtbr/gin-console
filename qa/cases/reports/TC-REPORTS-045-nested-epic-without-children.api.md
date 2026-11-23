# TC-REPORTS-045: Nested epic without children

- **REQ:** REQ-REPORTS-009@b3daf2cc
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 144f15a5

**Preconditions:**
- Project `alpha` has milestone `m2`
- Under milestone `m2` there is epic `e1`, whose only child is epic `e1.1`, which has no child beads

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha&milestone=m2`

**Expected:**
- `beads` holds `e1.1`, with itself as its epic
- `beads` does not hold `e1`
