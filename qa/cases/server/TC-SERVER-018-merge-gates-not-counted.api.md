# TC-SERVER-018: Merge gates not counted

- **REQ:** REQ-SERVER-006@8dcdf4d5
- **Priority:** high

**Preconditions:**
- Project `alpha` has 2 open ready tasks
- `alpha` has an open merge gate without blockers titled `external: .planning/plans/p.md#1`

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects`

**Expected:**
- `alpha` has `beads.open` 2 and `beads.ready` 2
