# TC-REPORTS-020: Rework rate

- **REQ:** REQ-REPORTS-010@fef59b89
- **Priority:** medium

**Preconditions:**
- `ann` closed 4 beads with `ai_usage`, one with 1 reopen, and 1 bead without `ai_usage`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`

**Expected:**
- `ann`'s row has `rework_rate` 0.25 and `reopens` 1
