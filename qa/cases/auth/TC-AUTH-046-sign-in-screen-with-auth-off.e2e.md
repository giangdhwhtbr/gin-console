# TC-AUTH-046: Sign-in screen with auth off

- **REQ:** REQ-AUTH-014@b775df24
- **Priority:** medium

**Preconditions:**
- The server answers `GET /api/auth/me` with `enabled` false
- No stored email

**Steps:**
1. Open the console

**Expected:**
- The email screen is shown
- No sign-in screen is shown
