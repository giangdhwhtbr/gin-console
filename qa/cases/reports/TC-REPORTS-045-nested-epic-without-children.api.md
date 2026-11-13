# TC-REPORTS-045: Nested epic without children

- **REQ:** REQ-REPORTS-009@45d47ef9
- **Priority:** medium

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
