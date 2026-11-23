# TC-REPORTS-020: Rework rate

- **REQ:** REQ-REPORTS-010@5a79bc07
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 9c8dc159

**Preconditions:**
- `ann` closed 4 beads, one of them reopened once in the interaction log and another with one bug found later (a `discovered-from` bug bead)

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`

**Expected:**
- `ann`'s row has `rework_rate` 0.5, `reopens` 1 and `bugs` 1
