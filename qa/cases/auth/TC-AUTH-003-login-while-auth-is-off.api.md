# TC-AUTH-003: Login while auth is off

- **REQ:** REQ-AUTH-001@ba7c4e83
- **Priority:** medium

**Preconditions:**
- Auth is off

**Steps:**
1. Post `{"username": "an", "password": "x"}` to `/api/auth/login`

**Expected:**
- The response is 404
