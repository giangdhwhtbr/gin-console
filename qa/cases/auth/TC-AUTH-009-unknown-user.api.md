# TC-AUTH-009: Unknown user

- **REQ:** REQ-AUTH-003@09fd6dcf
- **Priority:** high

**Preconditions:**
- Auth is on; no user `bo`

**Steps:**
1. Post username `bo` to `/api/auth/login`

**Expected:**
- The response is 401 with the same body as a wrong password
- A scrypt verification ran against the dummy hash
- No cookie is set
