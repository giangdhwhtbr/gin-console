# TC-AUTH-033: Password reset unknown user

- **REQ:** REQ-AUTH-011@9e38127d
- **Priority:** medium

**Preconditions:**
- No user `bo`

**Steps:**
1. Run `user passwd bo`

**Expected:**
- It exits 1
- The users file is unchanged
