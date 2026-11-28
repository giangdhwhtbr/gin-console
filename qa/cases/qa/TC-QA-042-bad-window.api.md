# TC-QA-042: Bad window

- **REQ:** REQ-QA-014@d76a7cda
- **Priority:** medium

**Preconditions:**
- Project `alpha`

**Steps:**
1. Send `GET /api/qa/trends/alpha?days=14`
2. Send `GET /api/qa/trends/alpha?tz=Mars/Base`

**Expected:**
- Each response is 422
- gin-qa did not run
