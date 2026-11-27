# TC-AUTH-026: Password reset ends the session

- **REQ:** REQ-AUTH-009@b203dbad
- **Priority:** high

**Preconditions:**
- `an` signed in; the operator runs `user passwd an`

**Steps:**
1. Request `GET /api/overview` as `an`

**Expected:**
- The response is 401
