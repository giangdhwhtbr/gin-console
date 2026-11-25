# TC-REQUIREMENTS-016: Timeout

- **REQ:** REQ-REQUIREMENTS-005@d6f45620
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** 7aeaef77

**Preconditions:**
- The trace does not answer in 30 seconds

**Steps:**
1. Send `GET /api/requirements?project=proj`

**Expected:**
- The response is 502 with an error naming the timeout
