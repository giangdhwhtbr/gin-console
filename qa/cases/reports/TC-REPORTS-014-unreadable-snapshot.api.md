# TC-REPORTS-014: Unreadable snapshot

- **REQ:** REQ-REPORTS-008@969b8165
- **Priority:** medium

**Preconditions:**
- The snapshot of `alpha` cannot be read as in REQ-BEADS-005

**Test data:**
- None

**Steps:**
1. A client requests the team report twice

**Expected:**
- Both responses are 502 with an `error` and the failure is not cached
