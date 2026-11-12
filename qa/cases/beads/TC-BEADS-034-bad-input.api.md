# TC-BEADS-034: Bad input

- **REQ:** REQ-BEADS-015@5fbddf5c
- **Priority:** medium

**Preconditions:**
- No project named `nope` is configured

**Steps:**
1. Send `GET /api/beads/milestones?project=nope`

**Expected:**
- The response is 404
