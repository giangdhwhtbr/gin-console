# TC-SERVER-010: Milestone not counted as ready

- **REQ:** REQ-SERVER-006@a9789995
- **Priority:** medium

**Preconditions:**
- Project `alpha` has 2 ready issues and an open milestone `m-1` without blockers

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects`

**Expected:**
- `beads.ready` of `alpha` is 2
