# TC-SERVER-018: Merge gates not counted

- **REQ:** REQ-SERVER-006@ec9c5c6d
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T14-14-56-api
- **Checked:** a44426d3

**Preconditions:**
- Project `alpha` has 2 open ready tasks
- `alpha` has an open merge gate without blockers titled `external: .planning/plans/p.md#1`

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects/beads`

**Expected:**
- `alpha` has `beads.open` 2 and `beads.ready` 2
