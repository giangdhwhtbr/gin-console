# TC-REPORTS-010: Undated milestone

- **REQ:** REQ-REPORTS-008@969b8165
- **Priority:** medium

**Preconditions:**
- A milestone bead without `metadata.end`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`

**Expected:**
- It is not in `milestones` and `undated` is 1
