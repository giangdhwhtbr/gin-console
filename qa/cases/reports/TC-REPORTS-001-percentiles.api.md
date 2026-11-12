# TC-REPORTS-001: Percentiles

- **REQ:** REQ-REPORTS-004@849689dc
- **Priority:** medium

**Preconditions:**
- Five closed tasks with cycle times of 1, 2, 3, 4 and 10 days

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- The task median is 3 days and the p85 lies between 4 and 10 days
