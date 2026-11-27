# TC-AUTH-005: Me after sign-in

- **REQ:** REQ-AUTH-002@222b89fb
- **Priority:** medium

**Preconditions:**
- A client signed in as `an`

**Steps:**
1. Request `GET /api/auth/me` with the session cookie

**Expected:**
- The response is 200 with `enabled` true
- `user.name` is `an`
