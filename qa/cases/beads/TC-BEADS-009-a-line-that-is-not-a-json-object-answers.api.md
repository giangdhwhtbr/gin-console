# TC-BEADS-009: A line that is not a JSON object answers 502

- **REQ:** REQ-BEADS-005@82adf461
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 7d32e1ea

**Preconditions:**
- Project P whose `issues.jsonl` has a valid first line and `[1, 2]` as second line

**Steps:**
1. Request the list of P

**Expected:**
- The response is 502
- `error` says a line is not a JSON object
