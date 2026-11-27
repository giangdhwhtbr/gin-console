# TC-AUTH-031: User add name taken

- **REQ:** REQ-AUTH-010@ae8b41d8
- **Priority:** medium

**Preconditions:**
- User `an` exists

**Steps:**
1. Run `user add an --email other@x.io --all-projects`

**Expected:**
- It exits 1
- The users file is unchanged
