# TC-QA-005: Timeout

- **REQ:** REQ-QA-002@a7a439ce
- **Priority:** medium

**Preconditions:**
- An export that does not answer in 30 seconds

**Steps:**
1. Send `GET /api/qa/cases?project=alpha`

**Expected:**
- The response is 502 with an `error` naming the timeout and the cause `null`
