# TC-BEADS-095: Image removed after the snapshot

- **REQ:** REQ-BEADS-028@487cfa9a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** 1d949ce0

**Preconditions:**
- Bead `a-1` of `alpha` whose image 1 was available when the export was read and was deleted since

**Steps:**
1. Send `GET /api/beads/alpha/a-1/images/1`

**Expected:**
- The response is 404
