# TC-SERVER-002: No process is started

- **REQ:** REQ-SERVER-010@bdb24d2b
- **Priority:** high

**Preconditions:**
- Two existing projects, each with `.beads/issues.jsonl`
- The fake `gin` and `bd` commands record each call

**Steps:**
1. Request `GET /api/projects/beads`

**Expected:**
- The response is 200
- No `gin` or `bd` process was started
