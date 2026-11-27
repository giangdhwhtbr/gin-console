# TC-QA-009: Failure is not kept

- **REQ:** REQ-QA-003@448eb6d0
- **Priority:** medium

**Preconditions:**
- An export that failed

**Steps:**
1. Send `GET /api/qa/cases?project=alpha`, which fails
2. Send `GET /api/qa/cases?project=alpha` again

**Expected:**
- The export ran again and the second response is 200
