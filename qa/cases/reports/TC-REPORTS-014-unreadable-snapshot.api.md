# TC-REPORTS-014: Unreadable snapshot

- **REQ:** REQ-REPORTS-008@969b8165
- **Priority:** medium

**Preconditions:**
- The snapshot of `alpha` cannot be read as in REQ-BEADS-005

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`
2. Send `GET /api/reports/team?project=alpha` again

**Expected:**
- Both responses are 502 with an `error`
- The failure is not cached
