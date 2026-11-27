# TC-AUTH-038: Users file atomic write

- **REQ:** REQ-AUTH-013@a5561620
- **Priority:** medium

**Preconditions:**
- A users file with `an`

**Steps:**
1. Run a write that fails before the rename

**Expected:**
- The old file is unchanged
