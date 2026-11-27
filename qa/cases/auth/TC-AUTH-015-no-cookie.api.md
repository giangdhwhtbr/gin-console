# TC-AUTH-015: No cookie

- **REQ:** REQ-AUTH-005@f4dbe79b
- **Priority:** high

**Preconditions:**
- Auth is on

**Steps:**
1. Request `GET /api/overview` without a cookie

**Expected:**
- The response is 401 with `{"error": "sign-in required"}`
