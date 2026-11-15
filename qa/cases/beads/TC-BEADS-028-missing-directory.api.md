# TC-BEADS-028: Missing directory

- **REQ:** REQ-BEADS-001@877b56b8
- **Priority:** medium

**Preconditions:**
- Project `ghost` is configured and its directory does not exist

**Steps:**
1. Send `GET /api/beads?project=ghost`

**Expected:**
- The response is 404
