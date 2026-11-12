# TC-BEADS-033: Undated milestone

- **REQ:** REQ-BEADS-015@5fbddf5c
- **Priority:** medium

**Preconditions:**
- Project `alpha` with an open milestone bead `m5` that has no `metadata.end`

**Steps:**
1. Send `GET /api/beads/milestones?project=alpha`

**Expected:**
- `m5` is listed with `end` `null`
- `m5` is not `current`
