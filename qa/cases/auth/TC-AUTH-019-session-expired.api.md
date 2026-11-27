# TC-AUTH-019: Session expired

- **REQ:** REQ-AUTH-006@7c93f697
- **Priority:** high

**Preconditions:**
- `session_ttl` 12h; `an` signed in 12 hours ago

**Steps:**
1. Request `GET /api/overview` with the old cookie

**Expected:**
- The response is 401
