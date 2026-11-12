# TC-BEADS-032: No open milestone

- **REQ:** REQ-BEADS-015@5fbddf5c
- **Priority:** medium

**Preconditions:**
- Project `alpha` whose milestones are all closed

**Steps:**
1. Send `GET /api/beads/milestones?project=alpha`

**Expected:**
- `current` is `null`
