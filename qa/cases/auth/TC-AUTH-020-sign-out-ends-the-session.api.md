# TC-AUTH-020: Sign out ends the session

- **REQ:** REQ-AUTH-006@7c93f697
- **Priority:** high

**Preconditions:**
- A client signed in as `an`

**Steps:**
1. Post to `/api/auth/logout`
2. Request `GET /api/overview` with the old cookie

**Expected:**
- The logout answers 204 and clears the cookie
- The next request answers 401
