# TC-OVERVIEW-006: No blocker to show

- **REQ:** REQ-OVERVIEW-002@1bf3dfee
- **Priority:** medium

**Preconditions:**
- A bead has status `blocked` and no blocker

**Steps:**
1. Build the overview
2. Request `GET /api/overview`

**Expected:**
- The bead is in `blocked`
- Its `blocker` is `null`
