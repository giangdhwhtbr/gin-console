# TC-QA-043: Old gin-qa on trends

- **REQ:** REQ-QA-014@d76a7cda
- **Priority:** medium

**Preconditions:**
- A gin-qa that answers `invalid choice: 'runs'`

**Steps:**
1. Send `GET /api/qa/trends/alpha`

**Expected:**
- The response is 502 with the cause `outdated`
