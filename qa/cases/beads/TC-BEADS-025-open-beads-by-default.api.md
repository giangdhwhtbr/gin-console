# TC-BEADS-025: Open beads by default

- **REQ:** REQ-BEADS-001@dc0f6cd9
- **Priority:** medium

**Preconditions:**
- Project `alpha` with 3 open beads, 1 in-progress bead and 4 closed beads

**Steps:**
1. Send `GET /api/beads?project=alpha`

**Expected:**
- 4 beads are returned
- None of the returned beads is closed
