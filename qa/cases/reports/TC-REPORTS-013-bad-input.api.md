# TC-REPORTS-013: Bad input

- **REQ:** REQ-REPORTS-008@7f0879ce
- **Priority:** medium

**Preconditions:**
- No project `nope` is configured
- Project `alpha` is configured

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=nope`
2. Send `GET /api/reports/team?project=alpha&milestone=a b`
3. Send `GET /api/reports/team?project=alpha&days=14`
4. Send `GET /api/reports/team?project=alpha&milestone=m1&days=7`

**Expected:**
- The response to step 1 is 404
- The responses to steps 2, 3 and 4 are 422
