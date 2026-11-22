# TC-BEADS-075: Bead without children

- **REQ:** REQ-BEADS-022@5b74cbda
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-35-00-api
- **Checked:** 0fc3410a

**Preconditions:**
- Project `alpha` has the task `t-9` without children

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/alpha/t-9`

**Expected:**
- `child_counts` is `{total: 0, closed: 0, in_progress: 0, blocked: 0, ready: 0, deferred: 0, prep_total: 0, prep_closed: 0}`
