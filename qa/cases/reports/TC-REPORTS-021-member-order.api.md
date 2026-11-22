# TC-REPORTS-021: Member order

- **REQ:** REQ-REPORTS-010@5a79bc07
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-45-api
- **Checked:** eda7f486

**Preconditions:**
- `ann` with 3 scope beads, `bao` with 5 and 6 without an assignee

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`

**Expected:**
- `members` is `bao`, `ann`, `Unassigned`
