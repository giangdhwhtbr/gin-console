# TC-AUTH-007: Username case

- **REQ:** REQ-AUTH-002@a39796dc
- **Priority:** low

**Preconditions:**
- Auth is on; user `an`

**Steps:**
1. Post username `An` with the right password to `/api/auth/login`

**Expected:**
- The sign-in succeeds with `user.name` `an`
