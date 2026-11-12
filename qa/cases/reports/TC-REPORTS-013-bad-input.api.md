# TC-REPORTS-013: Bad input

- **REQ:** REQ-REPORTS-008@969b8165
- **Priority:** medium

**Preconditions:**
- No project `nope` is configured
- Project `alpha` is configured

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=nope`
2. Send `GET /api/reports/team?project=alpha&milestone=a b`

**Expected:**
- The response to step 1 is 404
- The response to step 2 is 422
