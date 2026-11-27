# TC-AUTH-042: Grant is not a session

- **REQ:** REQ-AUTH-016@9b0a0c99
- **Priority:** high

**Preconditions:**
- `an`'s grant of a folder from the mockup list

**Steps:**
1. Request `GET /api/overview` with the grant as the `gin_console_session` cookie

**Expected:**
- The response is 401
