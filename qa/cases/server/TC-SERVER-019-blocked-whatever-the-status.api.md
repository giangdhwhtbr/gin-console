# TC-SERVER-019: Blocked whatever the status

- **REQ:** REQ-SERVER-006@ec9c5c6d
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** cf99de99

**Preconditions:**
- Project `alpha` has a bead with status `blocked` and no blocker
- `alpha` has an in-progress bead with an open blocker
- `alpha` has an in-progress bead without blockers

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects/beads`

**Expected:**
- `beads.blocked` of `alpha` is 2 (the first two beads)
- `beads.in_progress` is 1
