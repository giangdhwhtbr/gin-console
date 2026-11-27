# TC-AUTH-004: Sign in right password

- **REQ:** REQ-AUTH-002@222b89fb
- **Priority:** high

**Preconditions:**
- Auth is on; user `an` with projects `[a]` and password `P`

**Steps:**
1. Post `{"username": "an", "password": "P"}` to `/api/auth/login`

**Expected:**
- The response is 200 with `an`'s name, email, projects and no `mockup_grant` field
- The `gin_console_session` cookie is set with `HttpOnly`, `SameSite=Strict`, `Path=/` and `Max-Age=43200`
- The cookie value is at least 32 bytes of token
