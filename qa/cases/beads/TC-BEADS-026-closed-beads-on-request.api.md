# TC-BEADS-026: Closed beads on request

- **REQ:** REQ-BEADS-001@dc0f6cd9
- **Priority:** medium

**Preconditions:**
- Project `alpha` with 3 open beads, 1 in-progress bead and 4 closed beads

**Steps:**
1. Send `GET /api/beads?project=alpha&closed=1`

**Expected:**
- All 8 beads are returned
