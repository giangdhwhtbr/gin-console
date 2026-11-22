# TC-BEADS-081: Child counts by state

- **REQ:** REQ-BEADS-022@5b74cbda
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-49-57-api
- **Checked:** 85d9e597

**Preconditions:**
- Project `alpha` whose `bd export` holds epic `e-2` with the tracks `t-1` (closed), `t-2` (in progress), `t-3` (in progress and blocked by the open bead `x`), `t-4` (open and ready) and `t-5` (deferred)

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads?project=alpha`

**Expected:**
- `e-2` has `child_counts` `{total: 5, closed: 1, in_progress: 1, blocked: 1, ready: 1, deferred: 1, prep_total: 0, prep_closed: 0}`
