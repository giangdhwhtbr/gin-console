# TC-REPORTS-011: No milestones

- **REQ:** REQ-REPORTS-008@969b8165
- **Priority:** medium

**Preconditions:**
- Project `beta` without milestone beads

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=beta`

**Expected:**
- The response is 200 with `milestones` empty and `milestone` `null`
