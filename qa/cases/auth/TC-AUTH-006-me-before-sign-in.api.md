# TC-AUTH-006: Me before sign-in

- **REQ:** REQ-AUTH-002@222b89fb
- **Priority:** medium

**Preconditions:**
- Auth is on

**Steps:**
1. Request `GET /api/auth/me` without a cookie

**Expected:**
- The response is 200 with `enabled` true and `user` null
