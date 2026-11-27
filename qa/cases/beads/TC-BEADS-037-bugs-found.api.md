# TC-BEADS-037: Bugs found

- **REQ:** REQ-BEADS-002@368f5c8f
- **Priority:** medium

**Preconditions:**
- Project `alpha` has bead `b-1`
- Open bug `g-1`, closed bug `g-2` and epic `e-9` each have a `discovered-from` dependency on `b-1`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/alpha/b-1`

**Expected:**
- `bugs` lists `g-1` and `g-2`, each with type `discovered-from`
- `bugs` does not list `e-9`
- Neither `g-1` nor `g-2` appears in `dependents` or `children`
