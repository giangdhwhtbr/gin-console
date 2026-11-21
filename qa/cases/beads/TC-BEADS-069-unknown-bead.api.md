# TC-BEADS-069: Unknown bead

- **REQ:** REQ-BEADS-020@fa401781
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-21T05-29-13-api
- **Checked:** 9a7ac12c

**Preconditions:**
- Project `p` is configured and has no bead `nope`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/p/nope/workflow`

**Expected:**
- The answer is 404
- No `gin` command ran
