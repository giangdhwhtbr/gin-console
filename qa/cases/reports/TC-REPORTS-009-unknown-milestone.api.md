# TC-REPORTS-009: Unknown milestone

- **REQ:** REQ-REPORTS-008@969b8165
- **Priority:** medium

**Preconditions:**
- Project `alpha` with closed milestone `m1`, active milestone `m2` and planned milestone `m3`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha&milestone=gone`

**Expected:**
- The response is 200 with `milestone` `m2`
