# TC-QA-007: Two readers

- **REQ:** REQ-QA-003@448eb6d0
- **Priority:** medium

**Preconditions:**
- No kept answer; an export that takes a moment

**Steps:**
1. Send `GET /api/qa/cases?project=alpha` twice at once

**Expected:**
- The export ran once and both responses hold its answer
