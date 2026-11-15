# TC-SERVER-008: Counts and active epics

- **REQ:** REQ-SERVER-006@a80c9bc6
- **Priority:** high

**Preconditions:**
- Project `alpha` has 3 open, 1 in_progress and 2 ready issues
- `alpha` has epic `e-1` in_progress and epic `e-2` open and ready

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects`

**Expected:**
- `alpha` has a `beads` object with those counts
- `beads.epics` lists `e-1` and `e-2`, each with `id` and `title`
