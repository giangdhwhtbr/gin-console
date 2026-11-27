# TC-AUTH-011: Username locked

- **REQ:** REQ-AUTH-004@cb660bf4
- **Priority:** high

**Preconditions:**
- `per_user` 5; 5 failed sign-ins as `an` within the window

**Steps:**
1. Post `an` with the right password to `/api/auth/login`

**Expected:**
- The response is 429 with `{"error": "too many attempts"}`
- A `Retry-After` header in whole seconds is set
- No cookie is set
