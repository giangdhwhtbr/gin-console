# TC-AUTH-002: Me while auth is off

- **REQ:** REQ-AUTH-001@ba7c4e83
- **Priority:** medium

**Preconditions:**
- Auth is off

**Steps:**
1. Request `GET /api/auth/me`

**Expected:**
- The response is 200 with `enabled` false and `user` null
