# TC-BEADS-038: Unknown bead

- **REQ:** REQ-BEADS-002@9e07b166
- **Priority:** low

**Preconditions:**
- Project `alpha` is configured and has no bead `x-1`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/alpha/x-1`

**Expected:**
- The response is 404
