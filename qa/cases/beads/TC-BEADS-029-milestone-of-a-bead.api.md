# TC-BEADS-029: Milestone of a bead

- **REQ:** REQ-BEADS-001@dc0f6cd9
- **Priority:** medium

**Preconditions:**
- Project `alpha` with milestone `m2`, its closed epic `e1`, an open task `e1.1` under `e1`, and one open task `loose` under no milestone

**Steps:**
1. Send `GET /api/beads?project=alpha`

**Expected:**
- `e1.1` has `milestone` `m2`
- `m2` has `milestone` `m2`
- `loose` has `milestone` `null`
