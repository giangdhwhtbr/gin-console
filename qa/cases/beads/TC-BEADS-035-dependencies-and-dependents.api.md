# TC-BEADS-035: Dependencies and dependents

- **REQ:** REQ-BEADS-002@9e07b166
- **Priority:** medium

**Preconditions:**
- Project `alpha` has beads `b-1`, `b-2` and `b-3`
- `b-2` is blocked by `b-1` and blocks `b-3`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/alpha/b-2`

**Expected:**
- `dependencies` lists `b-1` with type `blocks`
- `dependents` lists `b-3`
