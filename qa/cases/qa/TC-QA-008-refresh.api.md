# TC-QA-008: Refresh

- **REQ:** REQ-QA-003@448eb6d0
- **Priority:** medium

**Preconditions:**
- A kept answer for `alpha`

**Steps:**
1. Send `POST /api/refresh`
2. Send `GET /api/qa/cases?project=alpha`

**Expected:**
- The export ran again
