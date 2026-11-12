# TC-REPORTS-023: Weekend close

- **REQ:** REQ-REPORTS-011@de698801
- **Priority:** medium

**Preconditions:**
- A scope bead of `ann` closed on Sunday 2026-11-08

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`

**Expected:**
- The entry for Friday 2026-11-06 counts 1 for `ann`
