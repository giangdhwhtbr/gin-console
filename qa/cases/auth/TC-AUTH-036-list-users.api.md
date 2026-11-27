# TC-AUTH-036: List users

- **REQ:** REQ-AUTH-012@dde67dd8
- **Priority:** medium

**Preconditions:**
- Users `an` and `root`

**Steps:**
1. Run `user list`

**Expected:**
- Both are printed with their email and projects
- No output contains `scrypt$`
