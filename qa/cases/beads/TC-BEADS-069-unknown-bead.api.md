# TC-BEADS-069: Unknown bead

- **REQ:** REQ-BEADS-020@b0eb251f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 692c283f

**Preconditions:**
- Project `p` is configured and has no bead `nope`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/p/nope/workflow`

**Expected:**
- The answer is 404
- No `gin` command ran
