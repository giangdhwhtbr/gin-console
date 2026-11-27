# TC-AUTH-008: Wrong password

- **REQ:** REQ-AUTH-003@09fd6dcf
- **Priority:** high

**Preconditions:**
- Auth is on; user `an`

**Steps:**
1. Post username `an` and a wrong password to `/api/auth/login`

**Expected:**
- The response is 401 with `{"error": "invalid username or password"}`
- No cookie is set
