# TC-BEADS-075: Bead without children

- **REQ:** REQ-BEADS-022@5b74cbda
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 6639aa37

**Preconditions:**
- Project `alpha` has the task `t-9` without children

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/alpha/t-9`

**Expected:**
- `child_counts` is `{total: 0, closed: 0, in_progress: 0, blocked: 0, ready: 0, deferred: 0, prep_total: 0, prep_closed: 0}`
