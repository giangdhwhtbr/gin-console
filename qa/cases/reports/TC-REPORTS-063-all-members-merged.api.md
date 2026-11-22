# TC-REPORTS-063: All members merged

- **REQ:** REQ-REPORTS-007@f51b674f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-45-api
- **Checked:** f71acc92

**Preconditions:**
- `ann` closed a bead in `alpha` that was reopened once, and a bead in `beta`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=all`

**Expected:**
- One Quality member row `ann` holds 2 closed beads and 1 reopen
