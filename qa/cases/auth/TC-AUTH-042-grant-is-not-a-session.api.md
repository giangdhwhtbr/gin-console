# TC-AUTH-042: Grant is not a session

- **REQ:** REQ-AUTH-016@d91a919b
- **Priority:** high

**Preconditions:**
- `an`'s grant

**Steps:**
1. Request `GET /api/overview` with the grant as the `gin_console_session` cookie

**Expected:**
- The response is 401
