# TC-REPORTS-022: Past end

- **REQ:** REQ-REPORTS-010@fef59b89
- **Priority:** medium

**Preconditions:**
- An open milestone that ended yesterday with 4 beads still open or in progress

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`

**Expected:**
- `team.late_open` is 4 and `pace_needed` is `null`
