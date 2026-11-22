# TC-BEADS-071: Blocked whatever the status

- **REQ:** REQ-BEADS-021@6fc8f7d7
- **Priority:** medium

**Preconditions:**
- Project `alpha` whose `bd export` holds: open bead `a`; open epic `e` blocked by `a` with the open child `e.1`; bead `b` with status `blocked` and no blocker; in-progress bead `c` blocked by `a`; in-progress bead `d` without blockers

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects`

**Expected:**
- The `beads` object of `alpha` has `blocked` 4 (`e`, `e.1`, `b` and `c`)
- The `beads` object of `alpha` has `in_progress` 1 (`d`)
