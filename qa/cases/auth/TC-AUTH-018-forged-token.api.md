# TC-AUTH-018: Forged token

- **REQ:** REQ-AUTH-005@f4dbe79b
- **Priority:** high

**Preconditions:**
- Auth is on

**Steps:**
1. Request `GET /api/overview` with the cookie `gin_console_session=forged`

**Expected:**
- The response is 401
