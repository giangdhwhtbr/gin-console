# TC-REPORTS-012: No process and cache

- **REQ:** REQ-REPORTS-008@969b8165
- **Priority:** medium

**Preconditions:**
- The team report for `alpha` was answered 20 seconds ago

**Test data:**
- None

**Steps:**
1. A client requests it again

**Expected:**
- No `gin` or `bd` process starts and the same `generated_at` is returned
