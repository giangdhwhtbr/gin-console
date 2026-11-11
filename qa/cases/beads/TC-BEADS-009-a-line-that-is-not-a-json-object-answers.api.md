# TC-BEADS-009: A line that is not a JSON object answers 502

- **REQ:** REQ-BEADS-005@b68c592c
- **Priority:** high

**Preconditions:**
- Project P whose `issues.jsonl` has a valid first line and `[1, 2]` as second line

**Steps:**
1. Request the list of P

**Expected:**
- The response is 502
- `error` says a line is not a JSON object
