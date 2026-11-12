# TC-BEADS-030: Current milestone

- **REQ:** REQ-BEADS-015@5fbddf5c
- **Priority:** high

**Preconditions:**
- Project `alpha` with closed milestone `m1`, active milestone `m2` and planned milestone `m3`

**Steps:**
1. Send `GET /api/beads/milestones?project=alpha`

**Expected:**
- `milestones` holds `m1`, `m2` and `m3` with statuses `closed`, `active` and `planned`
- `current` is `m2`
