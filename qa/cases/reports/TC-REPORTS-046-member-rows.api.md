# TC-REPORTS-046: Member rows

- **REQ:** REQ-REPORTS-003@3cabb52c
- **Priority:** medium

**Preconditions:**
- Project `alpha`: `ann` closed two beads of 100 and 300 tokens
- An unassigned bead of 50 tokens is closed

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- `usage.members` has a row for `ann` with 2 closed beads, 400 tokens and 200 tokens per bead
- `usage.members` has a row `Unassigned` with 1 closed bead and 50 tokens
