# TC-REPORTS-013: Bad input

- **REQ:** REQ-REPORTS-008@969b8165
- **Priority:** medium

**Preconditions:**
- No project `nope`

**Test data:**
- None

**Steps:**
1. A client requests `project=nope` and `project=alpha&milestone=a b`

**Expected:**
- The responses are 404 and 422
