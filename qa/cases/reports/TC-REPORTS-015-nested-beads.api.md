# TC-REPORTS-015: Nested beads

- **REQ:** REQ-REPORTS-009@522708e2
- **Priority:** medium

**Preconditions:**
- Milestone `m2` with epic `e1`, whose child `e1.1` has child `e1.1.1`, and epic `e9` under milestone `m3` with child `e9.1`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha&milestone=m2`

**Expected:**
- `beads` holds `e1.1` and `e1.1.1` with epic `e1`, and neither `e1` nor `e9.1`
