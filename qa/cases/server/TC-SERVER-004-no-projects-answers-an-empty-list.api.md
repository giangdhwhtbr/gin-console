# TC-SERVER-004: No projects answers an empty list

- **REQ:** REQ-SERVER-010@bdb24d2b
- **Priority:** low

**Preconditions:**
- A config with no projects

**Steps:**
1. Request `GET /api/projects/beads`

**Expected:**
- The response is `[]`
