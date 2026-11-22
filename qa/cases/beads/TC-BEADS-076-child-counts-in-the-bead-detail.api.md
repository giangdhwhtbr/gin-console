# TC-BEADS-076: Child counts in the bead detail

- **REQ:** REQ-BEADS-022@5b74cbda
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-35-00-api
- **Checked:** f1718b78

**Preconditions:**
- Project `alpha` as in TC-BEADS-074: epic `e-1` with tracks `t-1`, `t-2` (closed) and `t-3` (open), the closed prep task `p-1` and the merge gate `g-1`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/alpha/e-1`

**Expected:**
- `child_counts` is `{total: 3, closed: 2, in_progress: 0, blocked: 0, ready: 1, deferred: 0, prep_total: 1, prep_closed: 1}`
- `e-1` counts as done only when its own status is `closed`; with status `open` it is not done although 2 of 3 tracks are closed
