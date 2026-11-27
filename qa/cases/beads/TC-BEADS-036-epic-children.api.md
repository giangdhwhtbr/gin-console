# TC-BEADS-036: Epic children

- **REQ:** REQ-BEADS-002@368f5c8f
- **Priority:** medium

**Preconditions:**
- Project `alpha` has epic `e-1` with children `t-1`, `t-2` and `t-3`
- `t-3` is closed; `t-1` and `t-2` are open

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/alpha/e-1`

**Expected:**
- `children` lists `t-1`, `t-2` and `t-3`, each with its status
- `t-3` has status `closed`
