# TC-QA-045: Trends cache

- **REQ:** REQ-QA-014@d76a7cda
- **Priority:** medium

**Preconditions:**
- The trends of `alpha` for 30 days were read 10 seconds ago

**Steps:**
1. Send `GET /api/qa/trends/alpha?capability=ui`
2. Send `POST /api/refresh`
3. Send `GET /api/qa/trends/alpha` again

**Expected:**
- The export did not run for the first request
- The export ran again for the third request
