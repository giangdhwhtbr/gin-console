# TC-BEADS-010: One malformed bead is skipped

- **REQ:** REQ-BEADS-005@b68c592c
- **Priority:** medium

**Preconditions:**
- Project P whose `issues.jsonl` has 3 beads, one of which has a numeric `title`

**Steps:**
1. Request the list of P

**Expected:**
- The response is 200
- The 2 valid beads are returned
