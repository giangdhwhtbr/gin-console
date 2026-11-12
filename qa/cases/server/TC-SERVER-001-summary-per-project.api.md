# TC-SERVER-001: Summary per project

- **REQ:** REQ-SERVER-010@bdb24d2b
- **Priority:** high

**Preconditions:**
- Two configured projects in this order: P1 exists with 3 open, 1 in_progress and 2 ready beads in `.beads/issues.jsonl`; P2 has a directory that does not exist

**Steps:**
1. Request `GET /api/projects/beads`

**Expected:**
- Both projects are returned in config order
- P1 has `exists: true`, those counts and `stale: false`
- P2 has `exists: false` and `beads: null`
- Neither entry has `workflow`
