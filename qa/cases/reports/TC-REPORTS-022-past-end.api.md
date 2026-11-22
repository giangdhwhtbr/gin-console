# TC-REPORTS-022: Past end

- **REQ:** REQ-REPORTS-010@5a79bc07
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-45-api
- **Checked:** f89af8cd

**Preconditions:**
- An open milestone that ended yesterday with 4 beads still open or in progress

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`

**Expected:**
- `team.late_open` is 4 and `pace_needed` is `null`
