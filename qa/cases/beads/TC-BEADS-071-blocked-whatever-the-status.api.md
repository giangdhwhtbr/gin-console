# TC-BEADS-071: Blocked whatever the status

- **REQ:** REQ-BEADS-021@23b392e1
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** f9687185

**Preconditions:**
- Project `alpha` whose `bd export` holds: open bead `a`; open epic `e` blocked by `a` with the open child `e.1`; bead `b` with status `blocked` and no blocker; in-progress bead `c` blocked by `a`; in-progress bead `d` without blockers

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects/beads`

**Expected:**
- The `beads` object of `alpha` has `blocked` 4 (`e`, `e.1`, `b` and `c`)
- The `beads` object of `alpha` has `in_progress` 1 (`d`)
