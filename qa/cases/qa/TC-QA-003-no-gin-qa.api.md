# TC-QA-003: No gin-qa

- **REQ:** REQ-QA-002@a7a439ce
- **Priority:** high

**Preconditions:**
- A console host without `gin-qa`

**Steps:**
1. Send `GET /api/qa/cases?project=alpha`

**Expected:**
- The response is 502 with the cause `missing`
