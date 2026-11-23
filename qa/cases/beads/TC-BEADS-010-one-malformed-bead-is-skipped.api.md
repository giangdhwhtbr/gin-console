# TC-BEADS-010: One malformed bead is skipped

- **REQ:** REQ-BEADS-005@82adf461
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 8645dc32

**Preconditions:**
- Project P whose `issues.jsonl` has 3 beads, one of which has a numeric `title`

**Steps:**
1. Request the list of P

**Expected:**
- The response is 200
- The 2 valid beads are returned
