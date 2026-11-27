# TC-AUTH-052: No grant in the user

- **REQ:** REQ-AUTH-002@222b89fb
- **Priority:** medium

**Preconditions:**
- Auth is on; user `an` is signed in

**Steps:**
1. Request `GET /api/auth/me` with the session cookie

**Expected:**
- `user` has no `mockup_grant` field
