# TC-BEADS-069: Unknown bead

- **REQ:** REQ-BEADS-020@fa401781
- **Priority:** medium

**Preconditions:**
- Project `p` is configured and has no bead `nope`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/p/nope/workflow`

**Expected:**
- The answer is 404
- No `gin` command ran
