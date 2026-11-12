# TC-BEADS-023: Show closed

- **REQ:** REQ-BEADS-014@29794851
- **Priority:** medium

**Preconditions:**
- Project `alpha` with at least one closed bead

**Steps:**
1. Send `GET /api/beads?project=alpha` and note the `ETag` header
2. Send `GET /api/beads?project=alpha&closed=1` and note the `ETag` header

**Expected:**
- The two `ETag` values differ
