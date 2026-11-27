# TC-QA-026: Unknown milestone

- **REQ:** REQ-QA-009@ae4c97e1
- **Priority:** medium

**Preconditions:**
- No milestone `m9` in `alpha`

**Steps:**
1. Send `GET /api/qa/readiness/alpha/m9`

**Expected:**
- The response is 404
