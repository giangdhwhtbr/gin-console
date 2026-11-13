# TC-REPORTS-015: Nested beads

- **REQ:** REQ-REPORTS-009@45d47ef9
- **Priority:** medium

**Preconditions:**
- Project `alpha` has milestones `m2` and `m3`
- Under milestone `m2` there is epic `e1`, whose child `e1.1` has child `e1.1.1`
- Under milestone `m3` there is epic `e9` with child `e9.1`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha&milestone=m2`

**Expected:**
- `beads` holds `e1.1` and `e1.1.1`, each with epic `e1`
- `beads` holds neither `e1` nor `e9.1`
