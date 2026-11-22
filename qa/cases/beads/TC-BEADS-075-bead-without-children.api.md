# TC-BEADS-075: Bead without children

- **REQ:** REQ-BEADS-022@a14538e5
- **Priority:** medium

**Preconditions:**
- Project `alpha` has the task `t-9` without children

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/alpha/t-9`

**Expected:**
- `child_counts` is `{total: 0, closed: 0, prep_total: 0, prep_closed: 0}`
