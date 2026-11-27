# TC-BEADS-027: Unknown project

- **REQ:** REQ-BEADS-001@d5450d95
- **Priority:** medium

**Preconditions:**
- No project named `nope` is configured

**Steps:**
1. Send `GET /api/beads?project=nope`

**Expected:**
- The response is 404
