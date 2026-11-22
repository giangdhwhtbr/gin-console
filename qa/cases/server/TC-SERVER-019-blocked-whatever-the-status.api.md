# TC-SERVER-019: Blocked whatever the status

- **REQ:** REQ-SERVER-006@ea632040
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-35-00-api
- **Checked:** 6c8edcc1

**Preconditions:**
- Project `alpha` has a bead with status `blocked` and no blocker
- `alpha` has an in-progress bead with an open blocker
- `alpha` has an in-progress bead without blockers

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects`

**Expected:**
- `beads.blocked` of `alpha` is 2 (the first two beads)
- `beads.in_progress` is 1
