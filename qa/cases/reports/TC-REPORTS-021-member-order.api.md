# TC-REPORTS-021: Member order

- **REQ:** REQ-REPORTS-010@fef59b89
- **Priority:** medium

**Preconditions:**
- `ann` with 3 scope beads, `bao` with 5 and 6 without an assignee

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`

**Expected:**
- `members` is `bao`, `ann`, `Unassigned`
