# TC-REPORTS-063: Members of one project

- **REQ:** REQ-REPORTS-007@deeb89a4
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 2d122634

**Preconditions:**
- In `alpha`, `ann` closed one bead that was reopened once and one more bead

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- One Quality member row `ann` holds 2 closed beads and 1 reopen
