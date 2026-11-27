# TC-AUTH-010: Malformed login body

- **REQ:** REQ-AUTH-003@09fd6dcf
- **Priority:** medium

**Preconditions:**
- Auth is on

**Steps:**
1. Post `{"username": "an"}` without a password to `/api/auth/login`

**Expected:**
- The response is 401 with the same body as a wrong password
