# TC-BEADS-031: Period holds today

- **REQ:** REQ-BEADS-015@5fbddf5c
- **Priority:** medium

**Preconditions:**
- Project `alpha` whose only open milestone `m4` has no kickoff and runs from a date before today to a date after today

**Steps:**
1. Send `GET /api/beads/milestones?project=alpha`

**Expected:**
- `current` is `m4`
